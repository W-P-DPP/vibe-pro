// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  buildCurrentPageLoginRedirectUrl,
  buildStrictMenuLoginRedirectUrl,
  getStrictMenuLoginUrl,
  normalizeMenuTargetUrl,
  parseStrictMenuDevelopmentTargetMappings,
  resolveStrictMenuNavigationUrl,
  resolveStrictMenuTargetUrl,
} from './strict-menu-redirect'
import { LOGIN_TEMPLATE_AUTH_STORAGE_KEY } from './auth-session'

const originalLoginUrl = import.meta.env.VITE_STRICT_MENU_LOGIN_URL
const originalDevProjectUrl = import.meta.env.VITE_DEV_PROJECT_URL
const originalStrictMenuDevTargetMappings =
  import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS

afterEach(() => {
  localStorage.clear()
  delete import.meta.env.VITE_DEV_PROJECT_URL
  delete import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS

  if (originalLoginUrl === undefined) {
    delete import.meta.env.VITE_STRICT_MENU_LOGIN_URL
  } else {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = originalLoginUrl
  }

  if (originalDevProjectUrl !== undefined) {
    import.meta.env.VITE_DEV_PROJECT_URL = originalDevProjectUrl
  }

  if (originalStrictMenuDevTargetMappings !== undefined) {
    import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS =
      originalStrictMenuDevTargetMappings
  }
})

describe('strict-menu-redirect', () => {
  it('should normalize host-like login urls with protocol and port intact', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'

    expect(getStrictMenuLoginUrl()).toBe('http://www.zwpsite.icu:8082/login')
  })

  it('should normalize host-like menu target urls with protocol and port intact', () => {
    expect(normalizeMenuTargetUrl('www.zwpsite.icu:9000/tool')).toBe(
      'http://www.zwpsite.icu:9000/tool',
    )
  })

  it('should build strict login redirect urls with a full redirect parameter', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'

    expect(buildStrictMenuLoginRedirectUrl('www.zwpsite.icu:9000/tool')).toBe(
      'http://www.zwpsite.icu:8082/login?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A9000%2Ftool',
    )
  })

  it('should parse development target mappings from env configuration', () => {
    expect(
      parseStrictMenuDevelopmentTargetMappings(
        'http://www.zwpsite.icu:8082/agent/=>http://127.0.0.1:15697/agent/;http://www.zwpsite.icu:8082/reimburse/=>http://127.0.0.1:17697/reimburse/',
      ),
    ).toEqual([
      {
        productionPrefix: 'http://www.zwpsite.icu:8082/reimburse/',
        developmentBaseUrl: 'http://127.0.0.1:17697/reimburse/',
      },
      {
        productionPrefix: 'http://www.zwpsite.icu:8082/agent/',
        developmentBaseUrl: 'http://127.0.0.1:15697/agent/',
      },
    ])
  })

  it('should remap strict menu targets in development while preserving path state', () => {
    expect(
      resolveStrictMenuTargetUrl(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
        {
          isDevelopment: true,
          mappings: [
            {
              productionPrefix: 'http://www.zwpsite.icu:8082/agent/',
              developmentBaseUrl: 'http://127.0.0.1:15697/agent/',
            },
          ],
        },
      ),
    ).toBe('http://127.0.0.1:15697/agent/chat?tab=history#panel')
  })

  it('should keep strict menu targets unchanged when no development mapping matches', () => {
    expect(
      resolveStrictMenuTargetUrl(
        'http://www.zwpsite.icu:8082/file-server/workspace?name=readme#preview',
        {
          isDevelopment: true,
          mappings: [
            {
              productionPrefix: 'http://www.zwpsite.icu:8082/agent/',
              developmentBaseUrl: 'http://127.0.0.1:15697/agent/',
            },
          ],
        },
      ),
    ).toBe(
      'http://www.zwpsite.icu:8082/file-server/workspace?name=readme#preview',
    )
  })

  it('should keep strict menu targets unchanged in production mode', () => {
    expect(
      resolveStrictMenuTargetUrl(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
        {
          isDevelopment: false,
          mappings: [
            {
              productionPrefix: 'http://www.zwpsite.icu:8082/agent/',
              developmentBaseUrl: 'http://127.0.0.1:15697/agent/',
            },
          ],
        },
      ),
    ).toBe('http://www.zwpsite.icu:8082/agent/chat?tab=history#panel')
  })

  it('should open strict menu target directly when localStorage.token exists', () => {
    localStorage.setItem('token', 'direct-token')
    import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS =
      'http://www.zwpsite.icu:8082/agent/=>http://127.0.0.1:15697/agent/'

    expect(
      resolveStrictMenuNavigationUrl(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
      ),
    ).toBe('http://127.0.0.1:15697/agent/chat?tab=history#panel')
  })

  it('should use the longest matching development prefix', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'
    import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS =
      'http://www.zwpsite.icu:8082/=>http://127.0.0.1:19999/;http://www.zwpsite.icu:8082/agent/=>http://127.0.0.1:15697/agent/'

    expect(
      resolveStrictMenuNavigationUrl(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
      ),
    ).toBe(
      'http://www.zwpsite.icu:8082/login?redirect=http%3A%2F%2F127.0.0.1%3A15697%2Fagent%2Fchat%3Ftab%3Dhistory%23panel',
    )
  })

  it('should reuse login-template session token for strict menu navigation', () => {
    localStorage.setItem(
      LOGIN_TEMPLATE_AUTH_STORAGE_KEY,
      JSON.stringify({
        token: 'session-token',
        tokenType: 'Bearer',
        expiresAt: Date.now() + 60_000,
      }),
    )
    import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS =
      'http://www.zwpsite.icu:8082/agent/=>http://127.0.0.1:15697/agent/'

    expect(
      resolveStrictMenuNavigationUrl(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
      ),
    ).toBe('http://127.0.0.1:15697/agent/chat?tab=history#panel')
  })

  it('should keep unmatched external targets unchanged during login redirect construction', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'
    import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS =
      'http://www.zwpsite.icu:8082/agent/=>http://127.0.0.1:15697/agent/'

    expect(buildStrictMenuLoginRedirectUrl('https://target.example.com/path')).toBe(
      'http://www.zwpsite.icu:8082/login?redirect=https%3A%2F%2Ftarget.example.com%2Fpath',
    )
  })

  it('should redirect strict menu target to login when no reusable token exists', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'
    import.meta.env.VITE_STRICT_MENU_DEV_TARGET_MAPPINGS =
      'http://www.zwpsite.icu:8082/agent/=>http://127.0.0.1:15697/agent/'

    expect(
      resolveStrictMenuNavigationUrl(
        'http://www.zwpsite.icu:8082/agent/chat?tab=history#panel',
      ),
    ).toBe(
      'http://www.zwpsite.icu:8082/login?redirect=http%3A%2F%2F127.0.0.1%3A15697%2Fagent%2Fchat%3Ftab%3Dhistory%23panel',
    )
  })

  it('should build login redirect urls from the current page location', () => {
    window.history.replaceState({}, '', '/zwpsite?tab=home#workspace')
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'
    import.meta.env.VITE_DEV_PROJECT_URL = 'http://127.0.0.1:13697/zwpsite/'

    expect(buildCurrentPageLoginRedirectUrl()).toBe(
      'http://www.zwpsite.icu:8082/login?redirect=http%3A%2F%2Flocalhost%3A3000%2Fzwpsite%3Ftab%3Dhome%23workspace&spdev=http%3A%2F%2F127.0.0.1%3A13697%2Fzwpsite%2F',
    )
  })
})
