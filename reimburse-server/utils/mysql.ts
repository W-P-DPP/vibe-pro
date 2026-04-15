import 'reflect-metadata';
import { DataSource } from 'typeorm';
import config from '../src/config.ts';
import {
  ReimbursementAttachmentEntitySchema,
  ReimbursementEntitySchema,
} from '../src/reimbursement/reimbursement.entity.ts';
import { Logger } from './index.ts';

let dataSource: DataSource | undefined;
let initializationPromise: Promise<DataSource> | null = null;

export function getDataSource() {
  return dataSource;
}

export default async function initDataBase() {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  const logger = Logger.getInstance();
  logger.info('Initializing MySQL Database Connection...');

  dataSource = new DataSource({
    type: process.env.DB_TYPE || config.Database.type || 'mysql',
    host: process.env.DB_HOST || config.Database.host || '127.0.0.1',
    port: Number(process.env.DB_PORT || config.Database.port || 3306),
    username: process.env.DB_USER || config.Database.user || 'root',
    password: process.env.DB_PASSWORD || config.Database.password || 'password',
    database: process.env.DB_NAME || config.Database.database || 'wxbot',
    connectorPackage: 'mysql2',
    synchronize: true,
    logging: ['error'],
    timezone: process.env.DB_TIMEZONE || config.Database.timezone || '+08:00',
    charset: process.env.DB_CHARSET || config.Database.charset || 'utf8mb4',
    entities: [
      ReimbursementEntitySchema,
      ReimbursementAttachmentEntitySchema,
    ],
    migrations: ['src/**/*.migration.ts'],
  });

  initializationPromise = dataSource
    .initialize()
    .then((instance) => {
      initializationPromise = null;
      return instance;
    })
    .catch((error) => {
      initializationPromise = null;
      dataSource = undefined;
      throw error;
    });

  return initializationPromise;
}
