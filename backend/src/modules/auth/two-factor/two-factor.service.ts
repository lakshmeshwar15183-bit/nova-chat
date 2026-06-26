import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '@/common/prisma/prisma.service';
import { decryptSecret, deriveKey, encryptSecret } from '@/common/security/crypto.util';
import {
  base32Decode,
  buildOtpAuthUrl,
  generateBase32Secret,
  verifyTotp,
} from '@/common/security/totp.util';

export interface TwoFactorSetup {
  secret: string;
  otpauthUrl: string;
}

export interface TwoFactorChallengePayload {
  sub: string;
  purpose: 'two_factor';
}

const BACKUP_CODE_COUNT = 10;
const CHALLENGE_TTL = '5m';

/**
 * Owns all TOTP two-factor logic: enrollment, activation, verification, backup
 * codes and the short-lived login challenge token. Secrets are encrypted at rest
 * with AES-256-GCM; backup codes are stored as bcrypt hashes.
 */
@Injectable()
export class TwoFactorService {
  private readonly encryptionKey: Buffer;
  private readonly issuer: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {
    this.encryptionKey = deriveKey(this.config.get<string>('security.twoFactorKey')!);
    this.issuer = this.config.get<string>('security.twoFactorIssuer')!;
  }

  // ---- Enrollment ----------------------------------------------------------

  /** Generates a pending secret and provisioning URI; does not enable 2FA yet. */
  async setup(userId: string, accountName: string): Promise<TwoFactorSetup> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const secret = generateBase32Secret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorPendingSecret: encryptSecret(secret, this.encryptionKey) },
    });

    return {
      secret,
      otpauthUrl: buildOtpAuthUrl({ secret, accountName, issuer: this.issuer }),
    };
  }

  /** Confirms the pending secret with a TOTP code and activates 2FA. */
  async enable(userId: string, code: string): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }
    if (!user.twoFactorPendingSecret) {
      throw new BadRequestException('Start two-factor setup before enabling it');
    }

    const secret = decryptSecret(user.twoFactorPendingSecret, this.encryptionKey);
    if (!verifyTotp(code, base32Decode(secret))) {
      throw new BadRequestException('Invalid verification code');
    }

    const { plain, hashed } = await this.generateBackupCodes();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: true,
          twoFactorSecret: user.twoFactorPendingSecret,
          twoFactorPendingSecret: null,
        },
      }),
      this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
      this.prisma.twoFactorBackupCode.createMany({
        data: hashed.map((codeHash) => ({ userId, codeHash })),
      }),
    ]);

    return { backupCodes: plain };
  }

  /** Disables 2FA after verifying a current TOTP or backup code. */
  async disable(userId: string, code: string): Promise<{ disabled: true }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const valid = await this.verifyCode(userId, code);
    if (!valid) throw new BadRequestException('Invalid verification code');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorPendingSecret: null,
        },
      }),
      this.prisma.twoFactorBackupCode.deleteMany({ where: { userId } }),
    ]);

    return { disabled: true };
  }

  async status(userId: string): Promise<{ enabled: boolean; remainingBackupCodes: number }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });
    const remainingBackupCodes = user.twoFactorEnabled
      ? await this.prisma.twoFactorBackupCode.count({ where: { userId, usedAt: null } })
      : 0;
    return { enabled: user.twoFactorEnabled, remainingBackupCodes };
  }

  // ---- Login challenge -----------------------------------------------------

  async issueChallenge(userId: string): Promise<string> {
    const payload: TwoFactorChallengePayload = { sub: userId, purpose: 'two_factor' };
    return this.jwt.signAsync(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: CHALLENGE_TTL,
    });
  }

  async resolveChallenge(challengeToken: string): Promise<string> {
    let payload: TwoFactorChallengePayload;
    try {
      payload = await this.jwt.verifyAsync<TwoFactorChallengePayload>(challengeToken, {
        secret: this.config.get('jwt.accessSecret'),
      });
    } catch {
      throw new UnauthorizedException('Two-factor challenge expired or invalid');
    }
    if (payload.purpose !== 'two_factor') {
      throw new UnauthorizedException('Invalid two-factor challenge');
    }
    return payload.sub;
  }

  // ---- Verification --------------------------------------------------------

  /** Verifies a TOTP code or, failing that, consumes a one-time backup code. */
  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.twoFactorSecret) return false;

    const secret = decryptSecret(user.twoFactorSecret, this.encryptionKey);
    if (verifyTotp(code, base32Decode(secret))) return true;

    return this.consumeBackupCode(userId, code);
  }

  private async consumeBackupCode(userId: string, code: string): Promise<boolean> {
    const normalized = this.normalizeBackupCode(code);
    if (normalized.length === 0) return false;

    const candidates = await this.prisma.twoFactorBackupCode.findMany({
      where: { userId, usedAt: null },
    });
    for (const candidate of candidates) {
      if (await bcrypt.compare(normalized, candidate.codeHash)) {
        await this.prisma.twoFactorBackupCode.update({
          where: { id: candidate.id },
          data: { usedAt: new Date() },
        });
        return true;
      }
    }
    return false;
  }

  // ---- Backup codes --------------------------------------------------------

  private async generateBackupCodes(): Promise<{ plain: string[]; hashed: string[] }> {
    const plain: string[] = [];
    const hashed: string[] = [];
    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const code = this.formatBackupCode(randomBytes(5).toString('hex'));
      plain.push(code);
      hashed.push(await bcrypt.hash(this.normalizeBackupCode(code), 10));
    }
    return { plain, hashed };
  }

  /** Presents a 10-hex-char code as `xxxxx-xxxxx` for readability. */
  private formatBackupCode(hex: string): string {
    const upper = hex.toUpperCase();
    return `${upper.slice(0, 5)}-${upper.slice(5, 10)}`;
  }

  private normalizeBackupCode(code: string): string {
    return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }
}
