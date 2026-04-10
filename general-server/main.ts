import dotenv from 'dotenv';
import path from 'path';
import { createApp } from './app.ts';
import RedisService from "./utils/Redis.ts";
import initDataBase from "./utils/mysql.ts";
import "./eventRegister.ts";
import { initSiteMenuModule } from './src/siteMenu/siteMenu.repository.ts';


async function injectEnv() {
  const env = process.env.NODE_ENV || 'development';

  dotenv.config({
    path: path.resolve(process.cwd(), `.env.${env}`)
  });

  console.log('ENV:', env);
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
