import { createApp } from './app.ts';
import RedisService from "./utils/Redis.ts";
import initDataBase from "./utils/mysql.ts";
import "./eventRegister.ts";
import { initSiteMenuModule } from './src/siteMenu/siteMenu.repository.ts';
import { loadProfileEnv } from '@super-pro/shared-server';


async function injectEnv() {
  const { profile } = loadProfileEnv();

  console.log('ENV:', profile);
  console.log('PORT:', process.env.PORT);
}

async function initRedis() {
   const redis = RedisService.getInstance();
    await redis.connect();
}


async function initApp() {
  const app = createApp();

  const PORT = process.env.PORT || 30010;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

async function bootstrap() {
  try {
    await injectEnv()
    await initRedis() 
    await initDataBase();
    await initSiteMenuModule();
    await initApp();
  } catch (err) {
    console.error('Bootstrap error:', err);
    process.exit(1);
  }
}
bootstrap();
