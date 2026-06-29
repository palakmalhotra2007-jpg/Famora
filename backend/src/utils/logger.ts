import winston from 'winston';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.isDev ? 'debug' : 'info',
  format: logFormat,
  defaultMeta: { service: 'homehub-api' },
  transports: [
    new winston.transports.Console({
      format: config.isDev
        ? winston.format.combine(winston.format.colorize(), winston.format.simple())
        : logFormat,
    }),
  ],
});
