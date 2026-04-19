import { describe, expect, it } from 'vitest'
import { getRedirectTargetFromLocation } from './auth-redirect'

describe('auth-redirect', () => {
  it('keeps the redirect target unchanged outside development remapping', () => {
    expect(
      getRedirectTargetFromLocation(
        '?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Fagent%2Fchat%3Ftab%3Dhistory%23panel',
        {
          isDevelopment: false,
        },
      ),
    ).toBe('http://www.zwpsite.icu:8082/agent/chat?tab=history#panel')
  })

  it('rebuilds the redirect target against the development handoff base', () => {
    expect(
      getRedirectTargetFromLocation(
        '?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Fagent%2Fchat%3Ftab%3Dhistory%23panel&spdev=http%3A%2F%2F127.0.0.1%3A15697%2Fagent%2F',
        {
          isDevelopment: true,
        },
      ),
    ).toBe('http://127.0.0.1:15697/agent/chat?tab=history#panel')
  })

  it('keeps the original redirect target when development handoff is missing', () => {
    expect(
      getRedirectTargetFromLocation(
        '?redirect=http%3A%2F%2Fwww.zwpsite.icu%3A8082%2Fagent%2Fchat%3Ftab%3Dhistory%23panel',
        {
          isDevelopment: true,
        },
      ),
    ).toBe('http://www.zwpsite.icu:8082/agent/chat?tab=history#panel')
  })

  it('blocks unsafe redirect targets before any development remapping', () => {
    expect(
      getRedirectTargetFromLocation('?redirect=javascript%3Aalert(1)&spdev=http%3A%2F%2F127.0.0.1%3A15697%2Fagent%2F', {
        isDevelopment: true,
      }),
    ).toBeNull()
  })
})
