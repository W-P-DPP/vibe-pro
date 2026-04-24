import { describe, expect, it } from 'vitest';
import { sanitizeLogValue } from './logging.ts';

describe('shared-server logging helpers', () => {
  it('redacts default sensitive fields recursively', () => {
    expect(
      sanitizeLogValue({
        username: 'alice',
        password: 'secret',
        nested: {
          accessToken: 'token-value',
        },
        list: [
          {
            authorization: 'Bearer abc',
          },
        ],
      }),
    ).toEqual({
      username: 'alice',
      password: '[REDACTED]',
      nested: {
        accessToken: '[REDACTED]',
      },
      list: [
        {
          authorization: '[REDACTED]',
        },
      ],
    });
  });

  it('matches sensitive field names case-insensitively', () => {
    expect(
      sanitizeLogValue({
        Password: 'secret',
        COOKIE: 'session=1',
      }),
    ).toEqual({
      Password: '[REDACTED]',
      COOKIE: '[REDACTED]',
    });
  });

  it('supports custom sensitive fields', () => {
    expect(
      sanitizeLogValue(
        {
          apiKey: 'value',
        },
        {
          sensitiveFieldNames: ['apiKey'],
          replacement: '***',
        },
      ),
    ).toEqual({
      apiKey: '***',
    });
  });
});
