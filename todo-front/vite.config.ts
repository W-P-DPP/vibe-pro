import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const devPort = Number(env.VITE_DEV_PORT)

  return {
    base: '/todo/',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: Number.isFinite(devPort) && devPort > 0 ? devPort : 13700,
      allowedHosts: ['localhost', '127.0.0.1'],
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:30010',
          changeOrigin: true,
        },
        '/public': {
          target: env.VITE_PUBLIC_ASSET_PROXY_TARGET || 'http://127.0.0.1:30010',
          changeOrigin: true,
        },
      },
    },
  }
})
