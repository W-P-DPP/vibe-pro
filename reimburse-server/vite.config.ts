import { defineConfig } from 'vite';
import { builtinModules } from 'module';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkgPath = join(__dirname, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, { encoding: 'utf-8' }));

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    ssr: 'main.ts',
    outDir: 'dist',
    target: 'node18',
    rollupOptions: {
      external: [...builtinModules],
      output: {
        format: 'cjs',
        entryFileNames: '[name].cjs',
      },
    },
  },
  
  ssr: {
    noExternal: Object.keys(pkg.dependencies || {}),
  },
});
