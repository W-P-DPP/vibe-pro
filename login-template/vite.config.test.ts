import { describe, expect, it } from 'vitest'
import viteConfig from './vite.config'

describe('login-template vite proxy', () => {
  it('proxies /api requests to the local backend in development', async () => {
    const config =
      typeof viteConfig === 'function'
        ? await viteConfig({
            command: 'serve',
            mode: 'development',
            isSsrBuild: false,
            isPreview: false,
          })
        : viteConfig

    const proxy = config.server?.proxy as Record<string, { target: string }> | undefined

    expect(proxy).toBeDefined()
    expect(proxy?.['/api']).toBeDefined()
    expect(proxy?.['/api'].target).toBe('http://127.0.0.1:30010')
  })
})
