import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

type DependencyState = 'up' | 'down';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Liveness probe: confirms the process is running. Has no external
   * dependencies so orchestrators never restart a healthy container because of a
   * transient database/Redis blip.
   */
  @Public()
  @Get('live')
  live() {
    return { status: 'ok', uptime: process.uptime() };
  }

  /**
   * Readiness probe: confirms the instance can actually serve traffic (database
   * and Redis reachable). Returns 503 when a dependency is down so load balancers
   * stop routing to this instance until it recovers.
   */
  @Public()
  @Get('ready')
  async ready() {
    const checks = await this.checkDependencies();
    const ready = Object.values(checks).every((state) => state === 'up');
    if (!ready) {
      throw new ServiceUnavailableException({ status: 'not_ready', checks });
    }
    return { status: 'ready', checks };
  }

  /** Combined human-friendly status (always 200) for dashboards. */
  @Public()
  @Get()
  async check() {
    const checks = await this.checkDependencies();
    const healthy = Object.values(checks).every((state) => state === 'up');
    return { status: healthy ? 'ok' : 'degraded', checks, uptime: process.uptime() };
  }

  private async checkDependencies(): Promise<Record<string, DependencyState>> {
    const [database, redis] = await Promise.all([this.pingDatabase(), this.pingRedis()]);
    return { database, redis };
  }

  private async pingDatabase(): Promise<DependencyState> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'up';
    } catch {
      return 'down';
    }
  }

  private async pingRedis(): Promise<DependencyState> {
    try {
      await this.redis.client.ping();
      return 'up';
    } catch {
      return 'down';
    }
  }
}
