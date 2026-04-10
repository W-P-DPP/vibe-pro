import 'reflect-metadata';
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
    dataSource = new DataSource({
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
