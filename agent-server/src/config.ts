import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const config = require('../config.json') as { [key: string]: any };

export default config;
