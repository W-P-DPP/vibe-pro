import { describe, expect, it } from 'vitest'
import { resolveAuthApiBaseUrl, resolveAuthApiEndpoint } from './auth-api-config'

describe('resolveAuthApiBaseUrl', () => {
  it('uses a relative api path by default in development', () => {
    expect(resolveAuthApiBaseUrl(undefined, true)).toBe('')
    expect(resolveAuthApiEndpoint('/api/user/getLoginPublicKey', undefined, true)).toBe(
      '/api/user/getLoginPublicKey',
    )
  })

  it('uses an explicitly configured api base url when provided', () => {
    expect(resolveAuthApiBaseUrl('http://127.0.0.1:30010/', true)).toBe(
      'http://127.0.0.1:30010',
    )
    expect(
      resolveAuthApiEndpoint('/api/user/loginUser', 'http://127.0.0.1:30010/', true),
    ).toBe('http://127.0.0.1:30010/api/user/loginUser')
  })

  it('keeps production requests on the existing relative path behavior', () => {
    expect(resolveAuthApiBaseUrl(undefined, false)).toBe('')
    expect(resolveAuthApiEndpoint('/api/user/loginUser', undefined, false)).toBe(
      '/api/user/loginUser',
    )
  })
})
