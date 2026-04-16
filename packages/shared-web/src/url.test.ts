import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLoginRedirectUrl,
  normalizeAbsoluteUrl,
  shouldRedirectToLoginForRequestError,
} from './index.ts';

const originalWindow = globalThis.window;

describe('shared-web url helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: Window }).window;
      return;
    }

    vi.stubGlobal('window', originalWindow);
  });

  it('normalizes host-like urls with the current protocol', () => {
    vi.stubGlobal('window', {
      location: { protocol: 'https:' },
    });

    expect(normalizeAbsoluteUrl('www.zwpsite.icu:8082/login')).toBe(
      'https://www.zwpsite.icu:8082/login',
    );
  });

  it('normalizes root-relative urls against the current origin', () => {
    vi.stubGlobal('window', {
      location: { protocol: 'http:', origin: 'http://localhost:3000' },
    });

    expect(normalizeAbsoluteUrl('/agent')).toBe('http://localhost:3000/agent');
  });

  it('builds login redirect urls with encoded targets', () => {
    expect(
      buildLoginRedirectUrl(
        'http://www.zwpsite.icu:8082/login/',
        'http://localhost:3000/agent?tab=chat',
      ),
    ).toBe(
      'http://www.zwpsite.icu:8082/login/?redirect=http%3A%2F%2Flocalhost%3A3000%2Fagent%3Ftab%3Dchat',
    );
  });

  it('only redirects to login for authenticated 401 and 403 responses', () => {
    expect(shouldRedirectToLoginForRequestError(401, { requiresAuth: true })).toBe(true);
    expect(shouldRedirectToLoginForRequestError(403, { requiresAuth: true })).toBe(true);
    expect(shouldRedirectToLoginForRequestError(401, { requiresAuth: false })).toBe(false);
    expect(shouldRedirectToLoginForRequestError(500, { requiresAuth: true })).toBe(false);
  });
});
