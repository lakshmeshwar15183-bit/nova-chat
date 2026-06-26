import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  async check() {
    const checks = { database: 'unknown', redis: 'unknown' };
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }
    try {
      await this.redis.client.ping();
      checks.redis = 'up';
    } catch {
      checks.redis = 'down';
    }
    const healthy = Object.values(checks).every((s) => s === 'up');
    return { status: healthy ? 'ok' : 'degraded', checks, uptime: process.uptime() };
  }
}
