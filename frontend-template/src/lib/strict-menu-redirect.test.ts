// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import {
  buildCurrentPageLoginRedirectUrl,
  buildStrictMenuLoginRedirectUrl,
  getStrictMenuLoginUrl,
  normalizeMenuTargetUrl,
  resolveStrictMenuNavigationUrl,
} from './strict-menu-redirect'
import { LOGIN_TEMPLATE_AUTH_STORAGE_KEY } from './auth-session'

const originalLoginUrl = import.meta.env.VITE_STRICT_MENU_LOGIN_URL

afterEach(() => {
  localStorage.clear()

  if (originalLoginUrl === undefined) {
    delete import.meta.env.VITE_STRICT_MENU_LOGIN_URL
    return
  }

  import.meta.env.VITE_STRICT_MENU_LOGIN_URL = originalLoginUrl
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

  it('should open strict menu target directly when localStorage.token exists', () => {
    localStorage.setItem('token', 'direct-token')

    expect(resolveStrictMenuNavigationUrl('www.zwpsite.icu:9000/tool')).toBe(
      'http://www.zwpsite.icu:9000/tool',
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

    expect(resolveStrictMenuNavigationUrl('www.zwpsite.icu:9000/tool')).toBe(
      'http://www.zwpsite.icu:9000/tool',
    )
  })

  it('should redirect strict menu target to login when no reusable token exists', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'

    expect(resolveStrictMenuNavigationUrl('www.zwpsite.icu:9000/tool')).toBe(
      'http://www.zwpsite.icu:8082/login?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A9000%2Ftool',
    )
  })

  it('should build login redirect urls from the current page location', () => {
    window.history.replaceState({}, '', '/zwpsite?tab=home')
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'www.zwpsite.icu:8082/login'

    expect(buildCurrentPageLoginRedirectUrl()).toBe(
      'http://www.zwpsite.icu:8082/login?redirect=http%3A%2F%2Flocalhost%3A3000%2Fzwpsite%3Ftab%3Dhome',
    )
  })
})
