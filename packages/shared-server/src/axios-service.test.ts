import { describe, expect, it } from 'vitest';
import {
  formatAxiosLogPayload,
  SharedAxiosService,
} from './axios-service.ts';

describe('shared axios service', () => {
  it('creates axios instance from typed config', () => {
    const service = new SharedAxiosService({
      axiosConfig: {
        baseURL: 'https://example.test',
        timeout: 3000,
      },
    });

    const instance = service.getAxios();
    expect(instance.defaults.baseURL).toBe('https://example.test');
    expect(instance.defaults.timeout).toBe(3000);
  });

  it('sanitizes sensitive fields in logged payloads', () => {
    expect(formatAxiosLogPayload({
      token: 'secret-token',
      nested: {
        password: 'secret-password',
      },
    })).toBe('{"token":"[REDACTED]","nested":{"password":"[REDACTED]"}}');
  });

  it('truncates oversized logged payloads', () => {
    expect(formatAxiosLogPayload({
      data: 'x'.repeat(20),
    }, 12)).toBe('{"data":"xxx...[truncated]');
  });
});
