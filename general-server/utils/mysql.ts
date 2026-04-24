import 'reflect-metadata';
import { getDatabaseConfig } from '@super-pro/shared-server';
import { DataSource } from 'typeorm';
import config from '../src/config.ts';
import { OperationLogEntity } from '../src/operationLog/operationLog.entity.ts';
import { SiteMenuEntitySchema } from '../src/siteMenu/siteMenu.entity.ts';
import { UserEntitySchema } from '../src/user/user.entity.ts';
import { Logger } from './index.ts';

let dataSource: DataSource | undefined;
let initializationPromise: Promise<DataSource> | null = null;

export function getDataSource(): DataSource | undefined {
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
    const databaseConfig = getDatabaseConfig(config.Database, {
        nodeEnv: process.env.NODE_ENV,
    });

    dataSource = new DataSource({
        type: databaseConfig.type,
        host: databaseConfig.host,
        port: databaseConfig.port,
        username: databaseConfig.username,
        password: databaseConfig.password,
        database: databaseConfig.database,
        connectorPackage: 'mysql2',
        synchronize: databaseConfig.synchronize,
        logging: ['error'],
        timezone: databaseConfig.timezone,
        charset: databaseConfig.charset,

        entities: [OperationLogEntity, SiteMenuEntitySchema, UserEntitySchema],
        migrations: ['src/**/*.migration.ts']
    });

    initializationPromise = dataSource.initialize()
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
};
