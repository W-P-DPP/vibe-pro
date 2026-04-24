import { SharedRedisService } from '@super-pro/shared-server';
import config from '../src/config.ts';
import { Logger } from './index.ts';

class RedisService extends SharedRedisService {
  private static instance: RedisService;

  private constructor() {
    super({
      redis: config.Redis,
      logger: Logger.getInstance(),
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }

    return RedisService.instance;
  }
}

export default RedisService;
