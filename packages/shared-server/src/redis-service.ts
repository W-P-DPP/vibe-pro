import {
  createClient,
  type RedisClientType,
} from 'redis';
import type { ServerRedisConfig } from './server-config.ts';

export type RedisLoggerLike = {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
};

export type SharedRedisServiceOptions = {
  url?: string;
  redis?: ServerRedisConfig;
  logger?: RedisLoggerLike;
  maxReconnectRetries?: number;
};

const fallbackLogger: RedisLoggerLike = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export function buildRedisUrl(
  redis: ServerRedisConfig,
  envRedisUrl = process.env.REDIS_URL,
) {
  return envRedisUrl || `redis://${redis.host}:${redis.port}`;
}

export class SharedRedisService {
  private readonly client: RedisClientType;
  private readonly logger: RedisLoggerLike;
  private isConnected = false;

  constructor(options: SharedRedisServiceOptions = {}) {
    const redis = options.redis ?? {
      host: '127.0.0.1',
      port: 6379,
    };
    const maxReconnectRetries = options.maxReconnectRetries ?? 10;

    this.logger = options.logger ?? fallbackLogger;
    this.client = createClient({
      url: options.url ?? buildRedisUrl(redis),
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > maxReconnectRetries) {
            return new Error('Redis reconnect failed');
          }

          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('connect', () => {
      this.logger.info('[Redis] connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      this.logger.info('[Redis] ready');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.error(`[Redis] error: ${err}`);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      this.logger.warn('[Redis] connection closed');
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  getClient(): RedisClientType {
    return this.client;
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
      return;
    }

    await this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setJSON<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  async getJSON<T>(key: string): Promise<T | null> {
    const data = await this.get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    return (await this.client.expire(key, ttl)) === 1;
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async quit(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}
