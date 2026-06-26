import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TwoFactorService } from './two-factor.service';
import { base32Decode, totp } from '@/common/security/totp.util';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Exercises the full 2FA service against the real TOTP/crypto code with an
 * in-memory fake of the Prisma tables — no database required.
 */
describe('TwoFactorService', () => {
  const userId = 'user-1';
  let user: Record<string, any>;
  let backupCodes: Array<{ id: string; userId: string; codeHash: string; usedAt: Date | null }>;
  let service: TwoFactorService;

  const config = {
    get: (key: string) =>
      ({
        'security.twoFactorKey': 'unit-test-key',
        'security.twoFactorIssuer': 'NovaChat',
        'jwt.accessSecret': 'access-secret',
      })[key],
  } as unknown as ConfigService;

  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn(async () => ({ ...user })),
      findUnique: jest.fn(async () => ({ ...user })),
      update: jest.fn(async ({ data }: any) => {
        user = { ...user, ...data };
        return { ...user };
      }),
    },
    twoFactorBackupCode: {
      deleteMany: jest.fn(async () => {
        backupCodes = [];
        return { count: 0 };
      }),
      createMany: jest.fn(async ({ data }: any) => {
        for (const row of data) {
          backupCodes.push({ id: `bc-${backupCodes.length}`, usedAt: null, ...row });
        }
        return { count: data.length };
      }),
      findMany: jest.fn(async () => backupCodes.filter((c) => c.usedAt === null)),
      update: jest.fn(async ({ where, data }: any) => {
        const row = backupCodes.find((c) => c.id === where.id);
        if (row) Object.assign(row, data);
        return row;
      }),
      count: jest.fn(async () => backupCodes.filter((c) => c.usedAt === null).length),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;

  beforeEach(() => {
    user = { id: userId, email: 'jane@novachat.dev', twoFactorEnabled: false };
    backupCodes = [];
    service = new TwoFactorService(prisma, config, new JwtService({}));
  });

  it('setup stores an encrypted pending secret (never plaintext)', async () => {
    const { secret, otpauthUrl } = await service.setup(userId, user.email);
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(otpauthUrl).toContain('otpauth://totp/');
    expect(user.twoFactorPendingSecret).toBeDefined();
    expect(user.twoFactorPendingSecret).not.toContain(secret);
  });

  it('enable confirms the TOTP code, activates 2FA and returns 10 backup codes', async () => {
    const { secret } = await service.setup(userId, user.email);
    const code = totp(base32Decode(secret));

    const { backupCodes: codes } = await service.enable(userId, code);

    expect(codes).toHaveLength(10);
    expect(user.twoFactorEnabled).toBe(true);
    expect(user.twoFactorSecret).toBeDefined();
    expect(user.twoFactorPendingSecret).toBeNull();
    expect(backupCodes).toHaveLength(10);
  });

  it('rejects enable with a wrong code', async () => {
    await service.setup(userId, user.email);
    await expect(service.enable(userId, '000000')).rejects.toThrow('Invalid verification code');
    expect(user.twoFactorEnabled).toBe(false);
  });

  it('verifies a live TOTP code after enabling', async () => {
    const { secret } = await service.setup(userId, user.email);
    await service.enable(userId, totp(base32Decode(secret)));

    expect(await service.verifyCode(userId, totp(base32Decode(secret)))).toBe(true);
    expect(await service.verifyCode(userId, '000000')).toBe(false);
  });

  it('consumes a backup code exactly once', async () => {
    const { secret } = await service.setup(userId, user.email);
    const { backupCodes: codes } = await service.enable(userId, totp(base32Decode(secret)));

    expect(await service.verifyCode(userId, codes[0])).toBe(true);
    expect(await service.verifyCode(userId, codes[0])).toBe(false); // already used
    expect(await service.verifyCode(userId, codes[1])).toBe(true); // a different code still works
  });

  it('issues and resolves a login challenge token', async () => {
    const token = await service.issueChallenge(userId);
    expect(await service.resolveChallenge(token)).toBe(userId);
  });

  it('rejects a tampered/invalid challenge token', async () => {
    await expect(service.resolveChallenge('not-a-token')).rejects.toThrow();
  });

  it('disables 2FA after a valid code and clears secrets + backup codes', async () => {
    const { secret } = await service.setup(userId, user.email);
    await service.enable(userId, totp(base32Decode(secret)));

    await service.disable(userId, totp(base32Decode(secret)));

    expect(user.twoFactorEnabled).toBe(false);
    expect(user.twoFactorSecret).toBeNull();
    expect(backupCodes).toHaveLength(0);
  });
});
