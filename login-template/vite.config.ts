import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const devPort = Number(env.VITE_DEV_PORT)
  const apiProxyPrefix = env.VITE_API_PROXY_API?.trim() || '/api'
  const apiProxyConfig = {
    target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:30010',
    changeOrigin: true,
    ...(apiProxyPrefix === '/api'
      ? {}
      : {
          rewrite: (requestPath: string) =>
            requestPath.replace(new RegExp(`^${escapeRegExp(apiProxyPrefix)}`), '/api'),
        }),
  }

  return {
    base: '/login',
    plugins: [react(), tailwindcss()],
    test: {
      environment: 'node',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts: ['localhost', '127.0.0.1'],
      host: '0.0.0.0',
      port: Number.isFinite(devPort) && devPort > 0 ? devPort : 12697,
      proxy: {
        [apiProxyPrefix]: apiProxyConfig,
        '/public': {
          target: env.VITE_PUBLIC_ASSET_PROXY_TARGET || 'http://127.0.0.1:30010',
          changeOrigin: true,
        },
      },
    },
  }
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
