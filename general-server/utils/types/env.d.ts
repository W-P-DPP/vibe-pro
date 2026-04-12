declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    NODE_ENV: 'development' | 'production' | 'test';
    JWT_ENABLED: string;
    JWT_SECRET: string;
    REDIS_URL?: string;
    FILE_ROOT_PATH?: string;
    RUBBISH_ROOT_PATH?: string;
    FILE_UPLOAD_CHUNK_ROOT_PATH?: string;
    MAILER_HOST?: string;
    MAILER_PORT?: string;
    MAILER_SECURE?: string;
    MAILER_USER?: string;
    MAILER_PASS?: string;
    LOGIN_PASSWORD_PUBLIC_KEY?: string;
    LOGIN_PASSWORD_PRIVATE_KEY?: string;
  }
}
