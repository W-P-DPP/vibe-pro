import { loadServerConfig } from '@super-pro/shared-server';
import { fileURLToPath } from 'node:url';

const config = loadServerConfig({
  configPath: fileURLToPath(new URL('../config.json', import.meta.url)),
});

export default config;
