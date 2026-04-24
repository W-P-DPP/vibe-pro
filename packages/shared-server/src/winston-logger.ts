import fs from 'node:fs';
import path from 'node:path';
import winston, { type Logger as WinstonLogger } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

export type SharedLogConfig = {
  rotate?: boolean;
  datePattern?: string;
  maxFiles?: string;
  level?: string;
  logDir?: string;
};

export type CreateWinstonLoggerOptions = {
  logConfig?: SharedLogConfig;
  cwd?: string;
  nodeEnv?: string;
};

function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function resolveLogDirectory(options: CreateWinstonLoggerOptions = {}) {
  return path.resolve(options.cwd ?? process.cwd(), options.logConfig?.logDir ?? 'logs');
}

export function createWinstonLogger(
  options: CreateWinstonLoggerOptions = {},
): WinstonLogger {
  const logConfig = options.logConfig ?? {};
  const logDir = resolveLogDirectory(options);
  const isProd = (options.nodeEnv ?? process.env.NODE_ENV) === 'production';
  const level = logConfig.level ?? 'info';

  ensureDirectory(logDir);

  const { combine, timestamp, printf, colorize, json } = winston.format;
  const devFormat = printf(({ level: logLevel, message, timestamp: currentTimestamp, ...meta }) => {
    return `${currentTimestamp} [${logLevel}] ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    }`;
  });

  const fileFormat = combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    isProd ? json() : devFormat,
  );

  const makeTransport = (filename: string, transportLevel?: string): winston.transport => {
    if (logConfig.rotate) {
      return new DailyRotateFile({
        dirname: logDir,
        filename: `${filename}-%DATE%`,
        extension: '.log',
        datePattern: logConfig.datePattern ?? 'YYYY-MM-DD',
        maxFiles: logConfig.maxFiles ?? '30d',
        ...(transportLevel ? { level: transportLevel } : {}),
      });
    }

    return new winston.transports.File({
      filename: path.join(logDir, `${filename}.log`),
      ...(transportLevel ? { level: transportLevel } : {}),
    });
  };

  const logger = winston.createLogger({
    level,
    format: fileFormat,
    transports: [
      makeTransport('error', 'error'),
      makeTransport('app'),
    ],
  });

  if (!isProd) {
    logger.add(
      new winston.transports.Console({
        format: combine(colorize(), devFormat),
      }),
    );
  }

  return logger;
}
