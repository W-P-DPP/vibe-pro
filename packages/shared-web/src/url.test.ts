import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildLoginRedirectUrl,
  normalizeAbsoluteUrl,
  readDevelopmentRedirectHandoff,
  resolveDevelopmentRedirectTarget,
  shouldRedirectToLoginForRequestError,
} from './index.ts';

const originalWindow = globalThis.window;

describe('shared-web url helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalWindow === undefined) {
      Reflect.deleteProperty(globalThis, 'window');
      return;
    }

    vi.stubGlobal('window', originalWindow);
  });

  it('normalizes host-like urls with the current protocol', () => {
    vi.stubGlobal('window', {
      location: { protocol: 'https:' },
    });

    expect(normalizeAbsoluteUrl('www.zwpsite.icu/login')).toBe(
      'https://www.zwpsite.icu/login',
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
        'http://www.zwpsite.icu/login/',
        'http://localhost:3000/agent?tab=chat',
      ),
    ).toBe(
      'http://www.zwpsite.icu/login/?redirect=http%3A%2F%2Flocalhost%3A3000%2Fagent%3Ftab%3Dchat',
    );
  });

  it('attaches development redirect handoff data when provided', () => {
    expect(
      buildLoginRedirectUrl(
        'http://www.zwpsite.icu/login/',
        'http://www.zwpsite.icu:8082/agent?tab=chat#panel',
        {
          developmentRedirectHandoff: 'http://127.0.0.1:15697/agent/',
        },
      ),
    ).toBe(
      'http://www.zwpsite.icu/login/?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Fagent%3Ftab%3Dchat%23panel&spdev=http%3A%2F%2F127.0.0.1%3A15697%2Fagent%2F',
    );
  });

  it('reads development redirect handoff data from login urls', () => {
    expect(
      readDevelopmentRedirectHandoff(
        '?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Fagent&spdev=http%3A%2F%2F127.0.0.1%3A15697%2Fagent%2F',
      ),
    ).toBe('http://127.0.0.1:15697/agent/');
  });

  it('remaps development redirect targets to the configured project address', () => {
    expect(
      resolveDevelopmentRedirectTarget(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
        'http://127.0.0.1:15697/agent/',
        true,
      ),
    ).toBe('http://127.0.0.1:15697/agent/chat?tab=history#panel');
  });

  it('keeps the original redirect target outside development remapping', () => {
    expect(
      resolveDevelopmentRedirectTarget(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
        'http://127.0.0.1:15697/agent/',
        false,
      ),
    ).toBe('http://www.zwpsite.icu:8082/agent/chat?tab=history#panel');
  });

  it('keeps the original redirect target when the handoff base is invalid', () => {
    expect(
      resolveDevelopmentRedirectTarget(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
        'javascript:alert(1)',
        true,
      ),
    ).toBe('http://www.zwpsite.icu:8082/agent/chat?tab=history#panel');
  });

  it('only redirects to login for authenticated 401 and 403 responses', () => {
    expect(shouldRedirectToLoginForRequestError(401, { requiresAuth: true })).toBe(true);
    expect(shouldRedirectToLoginForRequestError(403, { requiresAuth: true })).toBe(true);
    expect(shouldRedirectToLoginForRequestError(401, { requiresAuth: false })).toBe(false);
    expect(shouldRedirectToLoginForRequestError(500, { requiresAuth: true })).toBe(false);
  });
});
