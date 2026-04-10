import { createClient, type RedisClientType } from 'redis';
import config from "../src/config.ts";
import { Logger } from './index.ts';

class RedisService {
    private static instance: RedisService;
    private client: RedisClientType;
    private isConnected = false;
    private logger = Logger.getInstance();

    private constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL || `redis://${config.Redis.host}:${config.Redis.port}`,
            socket: {
                reconnectStrategy: retries => {
                    // 最大重试 10 次
                    if (retries > 10) {
                        return new Error('Redis reconnect failed');
                    }
                    // 递增重连间隔（ms）
                    return Math.min(retries * 100, 3000);
                }
            }
        });

        this.client.on('connect', () => {
            this.logger.info('[Redis] connecting...');
        });

        this.client.on('ready', () => {
            this.isConnected = true;
            this.logger.info('[Redis] ready');
        });

        this.client.on('error', err => {
            this.isConnected = false;
            this.logger.error(`[Redis] error: ${err}`);
        });

        this.client.on('end', () => {
            this.isConnected = false;
            this.logger.warn('[Redis] connection closed');
        });
    }

    /** 获取单例 */
    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    /** 连接 Redis */
    public async connect(): Promise<void> {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }

    /** 获取原始 client（高级用法） */
    public getClient(): RedisClientType {
        return this.client;
    }

    /** 设置字符串 */
    public async set(
        key: string,
        value: string,
        ttl?: number
    ): Promise<void> {
        if (ttl) {
            await this.client.setEx(key, ttl, value);
        } else {
            await this.client.set(key, value);
        }
    }

    /** 获取字符串 */
    public async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    /** 设置 JSON */
    public async setJSON<T>(
        key: string,
        value: T,
        ttl?: number
    ): Promise<void> {
        const data = JSON.stringify(value);
        await this.set(key, data, ttl);
    }

    /** 获取 JSON */
    public async getJSON<T>(key: string): Promise<T | null> {
        const data = await this.get(key);
        return data ? (JSON.parse(data) as T) : null;
    }

    /** 删除 key */
    public async del(key: string): Promise<number> {
        return this.client.del(key);
    }

    /** 判断 key 是否存在 */
    public async exists(key: string): Promise<boolean> {
        return (await this.client.exists(key)) === 1;
    }

    /** 设置过期时间 */
    public async expire(key: string, ttl: number): Promise<boolean> {
        return (await this.client.expire(key, ttl)) === 1;
    }

    /** 原子自增 */
    public async incr(key: string): Promise<number> {
        return this.client.incr(key);
    }

    /** 原子自减 */
    public async decr(key: string): Promise<number> {
        return this.client.decr(key);
    }

    /** 关闭连接 */
    public async quit(): Promise<void> {
        if (this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
}

export default RedisService;
