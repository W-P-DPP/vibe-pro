import { describe, expect, it } from 'vitest';
import {
  ENV_FILE_NAMES,
  WORKSPACE_LOGIN_PATH,
  WORKSPACE_PRODUCTION_ORIGIN,
  joinUrl,
  trimTrailingSlash,
} from './index.ts';

describe('shared-constants', () => {
  it('trims trailing slashes', () => {
    expect(trimTrailingSlash('http://example.com///')).toBe('http://example.com');
  });

  it('joins base url and path consistently', () => {
    expect(joinUrl('http://example.com/', 'api/test')).toBe('http://example.com/api/test');
    expect(joinUrl('http://example.com///', '/api/test')).toBe('http://example.com/api/test');
  });

  it('exports workspace production defaults', () => {
    expect(WORKSPACE_PRODUCTION_ORIGIN).toBe('http://www.zwpsite.icu:8082');
    expect(WORKSPACE_LOGIN_PATH).toBe('/login/');
    expect(ENV_FILE_NAMES.production).toBe('.env.production');
  });
});
