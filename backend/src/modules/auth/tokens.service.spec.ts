import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { TokensService } from './tokens.service';

/**
 * Unit tests for TokensService using an in-memory fake of the Prisma session
 * table — no real database required.
 */
describe('TokensService', () => {
  let service: TokensService;
  let sessions: any[];

  const jwt = new JwtService({});
  const config = {
    get: (key: string) =>
      ({
        'jwt.accessSecret': 'access',
        'jwt.refreshSecret': 'refresh',
        'jwt.accessTtl': '15m',
        'jwt.refreshTtl': '7d',
      })[key],
  } as unknown as ConfigService;

  const prisma = {
    session: {
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `s${sessions.length + 1}`, revokedAt: null, ...data };
        sessions.push(row);
        return row;
      }),
      findMany: jest.fn(async () => sessions.filter((s) => !s.revokedAt)),
      update: jest.fn(async ({ where, data }: any) => {
        const row = sessions.find((s) => s.id === where.id);
        Object.assign(row, data);
        return row;
      }),
      updateMany: jest.fn(async ({ data }: any) => {
        sessions.forEach((s) => Object.assign(s, data));
        return { count: sessions.length };
      }),
    },
  } as any;

  beforeEach(() => {
    sessions = [];
    service = new TokensService(jwt, config, prisma);
  });

  it('issues a token pair and persists a hashed refresh token', async () => {
    const pair = await service.issueTokens({ sub: 'u1', email: 'a@b.c', username: 'a' });

    expect(pair.accessToken).toBeTruthy();
    expect(pair.refreshToken).toBeTruthy();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].refreshTokenHash).not.toEqual(pair.refreshToken);
    const matches = await bcrypt.compare(pair.refreshToken, sessions[0].refreshTokenHash);
    expect(matches).toBe(true);
  });

  it('rotates a valid refresh token, revoking the old session', async () => {
    const first = await service.issueTokens({ sub: 'u1', email: 'a@b.c', username: 'a' });
    const rotated = await service.rotate(first.refreshToken);

    expect(rotated.refreshToken).toBeTruthy();
    expect(sessions.find((s) => s.revokedAt)).toBeTruthy();
    expect(sessions.filter((s) => !s.revokedAt)).toHaveLength(1);
  });
});
