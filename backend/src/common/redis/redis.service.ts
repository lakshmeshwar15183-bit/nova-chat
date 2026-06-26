import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Thin wrapper around ioredis that also exposes a dedicated publisher and
 * subscriber connection for the WebSocket fan-out layer (Socket.IO Redis adapter
 * pattern). Caching helpers are provided for convenience.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  public client: Redis;
  public publisher: Redis;
  public subscriber: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('redis.url')!;
    this.client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
    this.publisher = this.client.duplicate();
    this.subscriber = this.client.duplicate();

    this.client.on('connect', () => this.logger.log('Connected to Redis'));
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async onModuleDestroy() {
    await Promise.allSettled([
      this.client?.quit(),
      this.publisher?.quit(),
      this.subscriber?.quit(),
    ]);
  }

  // ---- Caching helpers -----------------------------------------------------

  async cacheGet<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async cacheSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const payload = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, payload, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, payload);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.client.del(...keys);
  }

  // ---- Presence helpers ----------------------------------------------------

  async addSocket(userId: string, socketId: string): Promise<number> {
    const key = `socket:user:${userId}`;
    await this.client.sadd(key, socketId);
    const count = await this.client.scard(key);
    await this.client.set(`presence:user:${userId}`, '1', 'EX', 60);
    return count;
  }

  async removeSocket(userId: string, socketId: string): Promise<number> {
    const key = `socket:user:${userId}`;
    await this.client.srem(key, socketId);
    const count = await this.client.scard(key);
    if (count === 0) {
      await this.client.del(`presence:user:${userId}`);
      await this.client.set(`presence:lastseen:${userId}`, Date.now().toString());
    }
    return count;
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.client.exists(`presence:user:${userId}`)) === 1;
  }

  async getLastSeen(userId: string): Promise<number | null> {
    const v = await this.client.get(`presence:lastseen:${userId}`);
    return v ? parseInt(v, 10) : null;
  }
}
