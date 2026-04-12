// @vitest-environment jsdom

import { AxiosError } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getReusableAuthTokenMock, redirectToLoginWithCurrentPageMock } = vi.hoisted(() => ({
  getReusableAuthTokenMock: vi.fn(),
  redirectToLoginWithCurrentPageMock: vi.fn(),
}))

vi.mock('@/lib/auth-session', () => ({
  getReusableAuthToken: getReusableAuthTokenMock,
}))

vi.mock('@/lib/strict-menu-redirect', () => ({
  redirectToLoginWithCurrentPage: redirectToLoginWithCurrentPageMock,
}))

import {
  RequestError,
  request,
  requestClient,
  shouldRedirectToLoginForRequestError,
} from './request'

describe('request', () => {
  const originalAdapter = requestClient.defaults.adapter

  beforeEach(() => {
    getReusableAuthTokenMock.mockReset()
    redirectToLoginWithCurrentPageMock.mockReset()
  })

  afterEach(() => {
    requestClient.defaults.adapter = originalAdapter
  })

  it('should attach the reusable auth token to outgoing requests', async () => {
    getReusableAuthTokenMock.mockReturnValue('session-token')
    requestClient.defaults.adapter = vi.fn(async (config) => ({
      data: {
        authorization:
          typeof config.headers.get === 'function'
            ? config.headers.get('Authorization')
            : config.headers.Authorization,
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }))

    await expect(request.get<{ authorization: string }>('/site-menu/getMenu')).resolves.toEqual({
      authorization: 'Bearer session-token',
    })
  })

  it('should redirect to login when a protected request receives 401', async () => {
    requestClient.defaults.adapter = vi.fn(async (config) => {
      throw new AxiosError(
        'Unauthorized',
        'ERR_BAD_REQUEST',
        config as InternalAxiosRequestConfig,
        undefined,
        {
          data: { msg: '未登录' },
          status: 401,
          statusText: 'Unauthorized',
          headers: {},
          config,
        },
      )
    })

    await expect(
      request.get('/site-menu/getMenu', {
        requiresAuth: true,
      }),
    ).rejects.toBeInstanceOf(RequestError)

    expect(redirectToLoginWithCurrentPageMock).toHaveBeenCalledTimes(1)
  })

  it('should keep public request failures on the existing error path', async () => {
    requestClient.defaults.adapter = vi.fn(async (config) => {
      throw new AxiosError(
        'Forbidden',
        'ERR_BAD_REQUEST',
        config as InternalAxiosRequestConfig,
        undefined,
        {
          data: { msg: '没有权限' },
          status: 403,
          statusText: 'Forbidden',
          headers: {},
          config,
        },
      )
    })

    await expect(request.get('/posts')).rejects.toBeInstanceOf(RequestError)
    expect(redirectToLoginWithCurrentPageMock).not.toHaveBeenCalled()
  })

  it('should only redirect on unauthorized protected responses', () => {
    expect(shouldRedirectToLoginForRequestError(401, { requiresAuth: true })).toBe(true)
    expect(shouldRedirectToLoginForRequestError(403, { requiresAuth: true })).toBe(true)
    expect(shouldRedirectToLoginForRequestError(500, { requiresAuth: true })).toBe(false)
    expect(shouldRedirectToLoginForRequestError(401, { requiresAuth: false })).toBe(false)
  })
})
