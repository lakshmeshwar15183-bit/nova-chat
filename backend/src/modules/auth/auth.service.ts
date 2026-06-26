import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MailService } from '@/common/mail/mail.service';
import { TokensService } from './tokens.service';
import { TwoFactorService } from './two-factor/two-factor.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, VerifyOtpDto } from './dto';

type RequestMeta = { userAgent?: string; ipAddress?: string };

const OTP_PURPOSE = {
  EMAIL_VERIFICATION: 'EMAIL_VERIFICATION',
  PASSWORD_RESET: 'PASSWORD_RESET',
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly mail: MailService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  // ---- Registration --------------------------------------------------------

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email already in use' : 'Username already taken',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        passwordHash,
        profile: { create: { displayName: dto.displayName } },
        settings: { create: {} },
      },
    });

    await this.issueOtp(user.id, user.email, OTP_PURPOSE.EMAIL_VERIFICATION);

    return {
      message: 'Account created. Check your email for the verification code.',
      userId: user.id,
      email: user.email,
    };
  }

  // ---- Login ---------------------------------------------------------------

  async login(dto: LoginDto, meta: RequestMeta) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.identifier }, { username: dto.identifier }] },
      include: { profile: true },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email not verified. Please verify your account first.');
    }

    // When 2FA is active, defer token issuance behind a short-lived challenge.
    if (user.twoFactorEnabled) {
      return {
        requiresTwoFactor: true as const,
        challengeToken: await this.twoFactor.issueChallenge(user.id),
      };
    }

    const tokens = await this.tokens.issueTokens(
      { sub: user.id, email: user.email, username: user.username },
      meta,
    );
    return { ...tokens, user: this.sanitize(user) };
  }

  /** Completes a login that was deferred by a two-factor challenge. */
  async completeTwoFactorLogin(challengeToken: string, code: string, meta: RequestMeta) {
    const userId = await this.twoFactor.resolveChallenge(challengeToken);
    const verified = await this.twoFactor.verifyCode(userId, code);
    if (!verified) throw new UnauthorizedException('Invalid verification code');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.tokens.issueTokens(
      { sub: user.id, email: user.email, username: user.username },
      meta,
    );
    return { ...tokens, user: this.sanitize(user) };
  }

  // ---- OTP / verification --------------------------------------------------

  async verifyEmail(dto: VerifyOtpDto, meta: RequestMeta) {
    const user = await this.consumeOtp(dto.email, dto.code, OTP_PURPOSE.EMAIL_VERIFICATION);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
    await this.mail.sendWelcome(user.email, user.username);

    const tokens = await this.tokens.issueTokens(
      { sub: user.id, email: user.email, username: user.username },
      meta,
    );
    const fresh = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });
    return { ...tokens, user: this.sanitize(fresh!) };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerified) {
      await this.issueOtp(user.id, user.email, OTP_PURPOSE.EMAIL_VERIFICATION);
    }
    // Always return success to avoid user enumeration.
    return { message: 'If the account exists, a new code has been sent.' };
  }

  // ---- Password reset ------------------------------------------------------

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (user) {
      await this.issueOtp(user.id, user.email, OTP_PURPOSE.PASSWORD_RESET);
    }
    return { message: 'If the account exists, a reset code has been sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.consumeOtp(dto.email, dto.code, OTP_PURPOSE.PASSWORD_RESET);
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    // Force re-authentication on all devices.
    await this.tokens.revokeAll(user.id);
    return { message: 'Password updated. Please log in again.' };
  }

  // ---- Token lifecycle -----------------------------------------------------

  refresh(refreshToken: string, meta: RequestMeta) {
    return this.tokens.rotate(refreshToken, meta);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.tokens.revokeByToken(userId, refreshToken);
    }
    return { message: 'Logged out' };
  }

  // ---- Google OAuth --------------------------------------------------------

  async validateOAuthLogin(
    profile: { googleId: string; email: string; displayName: string; avatarUrl?: string },
    meta: RequestMeta,
  ) {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
      include: { profile: true },
    });

    if (!user) {
      const baseUsername = profile.email.split('@')[0].replace(/[^a-zA-Z0-9_.]/g, '');
      const username = await this.uniqueUsername(baseUsername);
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          username,
          googleId: profile.googleId,
          emailVerified: true,
          profile: {
            create: { displayName: profile.displayName, avatarUrl: profile.avatarUrl },
          },
          settings: { create: {} },
        },
        include: { profile: true },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, emailVerified: true },
        include: { profile: true },
      });
    }

    const tokens = await this.tokens.issueTokens(
      { sub: user.id, email: user.email, username: user.username },
      meta,
    );
    return { ...tokens, user: this.sanitize(user) };
  }

  // ---- Helpers -------------------------------------------------------------

  private async issueOtp(userId: string, email: string, purpose: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 8);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpToken.updateMany({
      where: { userId, purpose, consumed: false },
      data: { consumed: true },
    });
    await this.prisma.otpToken.create({ data: { userId, codeHash, purpose, expiresAt } });
    await this.mail.sendOtp(email, code, purpose);
  }

  private async consumeOtp(email: string, code: string, purpose: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('Invalid or expired code');

    const token = await this.prisma.otpToken.findFirst({
      where: { userId: user.id, purpose, consumed: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!token) throw new BadRequestException('Invalid or expired code');

    const valid = await bcrypt.compare(code, token.codeHash);
    if (!valid) throw new BadRequestException('Invalid or expired code');

    await this.prisma.otpToken.update({ where: { id: token.id }, data: { consumed: true } });
    return user;
  }

  private async uniqueUsername(base: string): Promise<string> {
    let candidate = base || 'user';
    let suffix = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const taken = await this.prisma.user.findUnique({ where: { username: candidate } });
      if (!taken) return candidate;
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
  }

  private sanitize(user: any) {
    const { passwordHash, googleId, twoFactorSecret, twoFactorPendingSecret, ...rest } = user;
    return rest;
  }
}
