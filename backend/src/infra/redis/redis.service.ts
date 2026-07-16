import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis | null;

  constructor(config: ConfigService) {
    const url = (config.get<string>('redisUrl') ?? '').trim();
    const disabled =
      !url ||
      url === 'off' ||
      url === 'disabled' ||
      url === 'none' ||
      process.env.REDIS_DISABLED === 'true';

    if (disabled) {
      // Demo / free hosting：不连 Redis，聊天上下文仍在 Postgres
      this.client = null;
      return;
    }

    const redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    redis.on('error', () => {
      // optional
    });
    void redis.connect().catch(() => undefined);
    this.client = redis;
  }

  async onModuleDestroy() {
    if (!this.client) return;
    try {
      await this.client.quit();
    } catch {
      // ignore
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds = 86400): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // ignore offline redis
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(key);
    } catch {
      // ignore offline redis
    }
  }
}
