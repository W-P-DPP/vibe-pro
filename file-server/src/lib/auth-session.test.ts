import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAuthToken, redirectToLoginPage } from './auth-session'

const originalWindow = globalThis.window
const originalLoginUrl = import.meta.env.VITE_STRICT_MENU_LOGIN_URL
const originalDevProjectUrl = import.meta.env.VITE_DEV_PROJECT_URL

afterEach(() => {
  vi.unstubAllGlobals()

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window')
  } else {
    vi.stubGlobal('window', originalWindow)
  }

  if (originalLoginUrl === undefined) {
    delete import.meta.env.VITE_STRICT_MENU_LOGIN_URL
  } else {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = originalLoginUrl
  }

  if (originalDevProjectUrl === undefined) {
    delete import.meta.env.VITE_DEV_PROJECT_URL
  } else {
    import.meta.env.VITE_DEV_PROJECT_URL = originalDevProjectUrl
  }
})

describe('file-server auth-session', () => {
  it('consumes query auth handoff and clears spauth from the current url', () => {
    const replaceState = vi.fn()
    const localStorage = new Map<string, string>()

    vi.stubGlobal('window', {
      location: {
        search:
          '?spauth=%7B%22key%22%3A%22super-pro.auth-handoff%22%2C%22session%22%3A%7B%22token%22%3A%22handoff-token%22%2C%22tokenType%22%3A%22Bearer%22%2C%22expiresAt%22%3A4102444800000%7D%7D',
        pathname: '/file-server/workspace',
        hash: '#preview',
      },
      history: {
        replaceState,
      },
      name: '',
      localStorage: {
        getItem: vi.fn((key: string) => localStorage.get(key) ?? null),
        removeItem: vi.fn((key: string) => {
          localStorage.delete(key)
        }),
        setItem: vi.fn((key: string, value: string) => {
          localStorage.set(key, value)
        }),
      },
    })

    expect(getAuthToken()).toBe('handoff-token')
    expect(localStorage.get('login-template.auth')).toContain('"token":"handoff-token"')
    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/file-server/workspace#preview',
    )
  })

  it('uses the configured development project url when redirecting the current page to login', () => {
    import.meta.env.VITE_STRICT_MENU_LOGIN_URL = 'http://127.0.0.1:12697/login/'
    import.meta.env.VITE_DEV_PROJECT_URL = 'http://127.0.0.1:16697/file-server/'

    const assign = vi.fn()

    vi.stubGlobal('window', {
      location: {
        href: 'http://www.zwpsite.icu:8082/file-server/workspace/docs?name=readme#preview',
        assign,
      },
      localStorage: {
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        setItem: vi.fn(),
      },
    })

    const redirectedUrl = redirectToLoginPage()

    expect(redirectedUrl).toBe(
      'http://127.0.0.1:12697/login/?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Ffile-server%2Fworkspace%2Fdocs%3Fname%3Dreadme%23preview&spdev=http%3A%2F%2F127.0.0.1%3A16697%2Ffile-server%2F',
    )
    expect(assign).toHaveBeenCalledWith(redirectedUrl)
  })
})
