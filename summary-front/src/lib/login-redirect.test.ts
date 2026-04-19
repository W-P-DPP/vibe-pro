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

describe('summary-front login redirect', () => {
  it('uses the configured development project url for current-page login redirects', () => {
    import.meta.env.VITE_LOGIN_URL = 'http://127.0.0.1:12697/login/';
    import.meta.env.VITE_DEV_PROJECT_URL = 'http://127.0.0.1:18697/summary-front/';

    vi.stubGlobal('window', {
      location: {
        href: 'http://www.zwpsite.icu:8082/summary-front/dashboard?range=today#cpu',
      },
    });

    expect(buildCurrentPageLoginRedirectUrl()).toBe(
      'http://127.0.0.1:12697/login/?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Fsummary-front%2Fdashboard%3Frange%3Dtoday%23cpu&spdev=http%3A%2F%2F127.0.0.1%3A18697%2Fsummary-front%2F',
    );
  });
});
