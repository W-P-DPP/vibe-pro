import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildCurrentPageLoginRedirectUrl } from './login-redirect';

const originalWindow = globalThis.window;
const originalLoginUrl = import.meta.env.VITE_LOGIN_URL;
const originalDevProjectUrl = import.meta.env.VITE_DEV_PROJECT_URL;

afterEach(() => {
  vi.unstubAllGlobals();

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    vi.stubGlobal('window', originalWindow);
  }

  if (originalLoginUrl === undefined) {
    delete import.meta.env.VITE_LOGIN_URL;
  } else {
    import.meta.env.VITE_LOGIN_URL = originalLoginUrl;
  }

  if (originalDevProjectUrl === undefined) {
    delete import.meta.env.VITE_DEV_PROJECT_URL;
  } else {
    import.meta.env.VITE_DEV_PROJECT_URL = originalDevProjectUrl;
  }
});

describe('reimburse-front login redirect', () => {
  it('uses the configured development project url for current-page login redirects', () => {
    import.meta.env.VITE_LOGIN_URL = 'http://127.0.0.1:12697/login/';
    import.meta.env.VITE_DEV_PROJECT_URL = 'http://127.0.0.1:17697/reimburse/';

    vi.stubGlobal('window', {
      location: {
        href: 'http://www.zwpsite.icu:8082/reimburse/forms?status=pending#table',
      },
    });

    expect(buildCurrentPageLoginRedirectUrl()).toBe(
      'http://127.0.0.1:12697/login/?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Freimburse%2Fforms%3Fstatus%3Dpending%23table&spdev=http%3A%2F%2F127.0.0.1%3A17697%2Freimburse%2F',
    );
  });
});
