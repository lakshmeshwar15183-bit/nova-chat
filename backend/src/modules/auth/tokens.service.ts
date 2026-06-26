import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Issues and rotates JWT access/refresh token pairs. Refresh tokens are
 * persisted (hashed) as Session rows so they can be revoked individually,
 * enabling multi-device session management.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async issueTokens(
    payload: JwtPayload,
    meta: { userAgent?: string; ipAddress?: string } = {},
  ): Promise<TokenPair> {
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('jwt.accessSecret'),
      expiresIn: this.config.get('jwt.accessTtl'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('jwt.refreshSecret'),
      expiresIn: this.config.get('jwt.refreshTtl'),
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: payload.sub,
        refreshTokenHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  async rotate(refreshToken: string, meta: { userAgent?: string; ipAddress?: string } = {}) {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find the matching, non-revoked session.
    const sessions = await this.prisma.session.findMany({
      where: { userId: payload.sub, revokedAt: null, expiresAt: { gt: new Date() } },
    });
    const matched = await this.findMatchingSession(sessions, refreshToken);
    if (!matched) throw new UnauthorizedException('Session expired or revoked');

    // Rotate: revoke old, issue new pair.
    await this.prisma.session.update({
      where: { id: matched.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(
      { sub: payload.sub, email: payload.email, username: payload.username },
      meta,
    );
  }

  private async findMatchingSession(
    sessions: { id: string; refreshTokenHash: string }[],
    token: string,
  ) {
    for (const session of sessions) {
      if (await bcrypt.compare(token, session.refreshTokenHash)) return session;
    }
    return null;
  }

  async revokeAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByToken(userId: string, refreshToken: string) {
    const sessions = await this.prisma.session.findMany({
      where: { userId, revokedAt: null },
    });
    const matched = await this.findMatchingSession(sessions, refreshToken);
    if (matched) {
      await this.prisma.session.update({
        where: { id: matched.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  listSessions(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, userId },
      data: { revokedAt: new Date() },
    });
  }
}
