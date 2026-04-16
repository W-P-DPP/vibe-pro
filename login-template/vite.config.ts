import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
 const env = loadEnv(mode, __dirname, '')

  return {
    base: '/login',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts: ['www.zwpsite.icu'],
      host: '0.0.0.0',
      port: env.VITE_DEV_PORT||12697,
    },
  }
})
