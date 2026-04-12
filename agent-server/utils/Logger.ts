// src/logger/Logger.ts
import winston, { Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import config from '../src/config.ts';

const logConfig = config.log as {
  rotate: boolean;
  datePattern: string;
  maxFiles: string;
};

export class Logger {
  private static instance: WinstonLogger;

  public static getInstance(): WinstonLogger {
    if (!Logger.instance) {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir);
      }

      const isProd = process.env.NODE_ENV === 'production';

      const { combine, timestamp, printf, colorize, json } = winston.format;

      const devFormat = printf(({ level, message, timestamp, ...meta }) => {
        return `${timestamp} [${level}] ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta) : ''
        }`;
      });

      const fmt = combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        isProd ? json() : devFormat
      );

      const makeTransport = (filename: string, level?: string): winston.transport => {
        if (logConfig?.rotate) {
          return new DailyRotateFile({
            dirname: logDir,
            filename: `${filename}-%DATE%`,
            extension: '.log',
            datePattern: logConfig.datePattern || 'YYYY-MM-DD',
            maxFiles: logConfig.maxFiles || '30d',
            ...(level ? { level } : {})
          });
        }
        return new winston.transports.File({
          filename: path.join(logDir, `${filename}.log`),
          ...(level ? { level } : {})
        });
      };

      Logger.instance = winston.createLogger({
        level: 'info',
        format: fmt,
        transports: [
          makeTransport('error', 'error'),
          makeTransport('app')
        ]
      });

      if (!isProd) {
        Logger.instance.add(
          new winston.transports.Console({
            format: combine(colorize(), devFormat)
          })
        );
      }
    }

    return Logger.instance;
  }
}
