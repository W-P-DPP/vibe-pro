import 'reflect-metadata';
import { DataSource } from 'typeorm';
import config from '../src/config.ts';
import { Logger } from './index.ts';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default async function initDataBase() {
    const logger = Logger.getInstance();
    logger.info('Initializing MySQL Database Connection...');
    const dataSource = new DataSource({
        type: config.Database.type || 'mysql',
        host:  config.Database.host || '127.0.0.1',
        port:  config.Database.port || 3306,
        username:  config.Database.user || 'root',
        password:  config.Database.password || 'password',
        database:  config.Database.database || 'wxbot',
        connectorPackage: 'mysql2',
        synchronize: true, // 生产环境一定 false
        logging: ['error'],
        timezone: config.Database.timezone || '+08:00',
        charset:config.Database.charset || 'utf8mb4',

        entities: ['src/**/*.entity.ts'],
        migrations: ['src/**/*.migration.ts']
    });
    return dataSource.initialize();
};
