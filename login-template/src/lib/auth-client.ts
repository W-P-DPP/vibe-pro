import forge from 'node-forge'
import { WORKSPACE_PRODUCTION_ORIGIN, trimTrailingSlash } from '@super-pro/shared-constants'
import type { ApiEnvelope } from '@super-pro/shared-types'

export type UserRole = 'admin' | 'guest'

export type AuthenticatedUser = {
  id: number
  username: string
  nickname: string
  email: string
  phone: string
  status: number
  role: UserRole
}

export type LoginRequest = {
  username: string
  password: string
}

type EncryptedLoginRequest = {
  username: string
  passwordCiphertext: string
}

type LoginPublicKeyResponse = {
  publicKey: string
}

export type LoginResponse = {
  token: string
  tokenType: 'Bearer'
  expiresIn: number
}

export type RegisterRequest = {
  username: string
  password: string
}

export type RegisterResponse = AuthenticatedUser

const DEFAULT_DEV_API_BASE_URL = WORKSPACE_PRODUCTION_ORIGIN

export class AuthApiError extends Error {
  readonly statusCode?: number

  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'AuthApiError'
    this.statusCode = statusCode
  }
}

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()

  if (configured) {
    return trimTrailingSlash(configured)
  }

  if (import.meta.env.DEV) {
    return DEFAULT_DEV_API_BASE_URL
  }

  return ''
}

function getEndpoint(path: string) {
  return `${getApiBaseUrl()}${path}`
}

function isAuthenticatedUser(value: unknown): value is AuthenticatedUser {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'number' &&
    typeof candidate.username === 'string' &&
    typeof candidate.nickname === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.phone === 'string' &&
    typeof candidate.status === 'number' &&
    (candidate.role === 'admin' || candidate.role === 'guest')
  )
}

function isLoginPublicKeyResponse(value: unknown): value is LoginPublicKeyResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.publicKey === 'string' &&
    candidate.publicKey.includes('BEGIN PUBLIC KEY')
  )
}

function isLoginResponse(value: unknown): value is LoginResponse {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.token === 'string' &&
    candidate.token.length > 0 &&
    candidate.tokenType === 'Bearer' &&
    typeof candidate.expiresIn === 'number' &&
    candidate.expiresIn > 0
  )
}

function isApiEnvelope<T>(
  value: unknown,
  guard: (data: unknown) => data is T,
): value is ApiEnvelope<T> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.code === 'number' &&
    typeof candidate.msg === 'string' &&
    guard(candidate.data)
  )
}

async function parseResponseBody(response: Response) {
  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
}

async function requestJson<T>(
  path: string,
  method: 'GET' | 'POST',
  guard: (data: unknown) => data is T,
  input?: Record<string, unknown>,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(getEndpoint(path), {
      method,
      headers: input
        ? {
            'Content-Type': 'application/json',
          }
        : undefined,
      ...(input ? { body: JSON.stringify(input) } : {}),
    })
  } catch {
    throw new AuthApiError('请求发送失败，请确认后端服务已启动')
  }

  const body = await parseResponseBody(response)

  if (!response.ok) {
    if (body && typeof body === 'object' && typeof (body as { msg?: unknown }).msg === 'string') {
      throw new AuthApiError((body as { msg: string }).msg, response.status)
    }

    throw new AuthApiError('请求失败，请稍后重试', response.status)
  }

  if (!isApiEnvelope(body, guard)) {
    throw new AuthApiError('接口返回结构异常，请检查后端响应')
  }

  if (body.code !== 200) {
    throw new AuthApiError(body.msg || '请求失败，请稍后重试', body.code)
  }

  return body.data
}

function encryptPassword(password: string, publicKey: string) {
  try {
    const rsaPublicKey = forge.pki.publicKeyFromPem(publicKey)
    const encrypted = rsaPublicKey.encrypt(forge.util.encodeUtf8(password), 'RSA-OAEP', {
      md: forge.md.sha256.create(),
      mgf1: {
        md: forge.md.sha256.create(),
      },
    })

    return forge.util.encode64(encrypted)
  } catch {
    throw new AuthApiError('登录密码加密失败，请刷新页面后重试')
  }
}

function getLoginPublicKey() {
  return requestJson('/api/user/getLoginPublicKey', 'GET', isLoginPublicKeyResponse)
}

function postJson<T>(
  path: string,
  input: Record<string, unknown>,
  guard: (data: unknown) => data is T,
) {
  return requestJson(path, 'POST', guard, input)
}

export async function loginUser(input: LoginRequest) {
  const keyPayload = await getLoginPublicKey()
  const passwordCiphertext = encryptPassword(input.password, keyPayload.publicKey)
  const payload: EncryptedLoginRequest = {
    username: input.username,
    passwordCiphertext,
  }

  return postJson('/api/user/loginUser', payload, isLoginResponse)
}

export function registerUser(input: RegisterRequest) {
  return postJson('/api/user/registerUser', input, isAuthenticatedUser)
}
