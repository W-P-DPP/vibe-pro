import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');

  return {
    base: '/agent',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts: ['www.zwpsite.icu'],
      host: '0.0.0.0',
      port: 56448,
      proxy: {
        '/agent-api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:30012',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent-api/, '/api'),
        },
      },
    },
  };
});
