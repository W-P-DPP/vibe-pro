import { describe, expect, it } from 'vitest';
import { buildRedisUrl } from './redis-service.ts';

describe('shared redis service helpers', () => {
  it('builds redis url from typed config', () => {
    expect(buildRedisUrl({
      host: 'redis.internal',
      port: 6380,
    }, undefined)).toBe('redis://redis.internal:6380');
  });

  it('lets REDIS_URL override host and port config', () => {
    expect(buildRedisUrl({
      host: 'redis.internal',
      port: 6380,
    }, 'redis://override:6379')).toBe('redis://override:6379');
  });
});
