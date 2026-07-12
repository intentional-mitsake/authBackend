import pino from 'pino';
import { version } from 'react';

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'yyyy-mm-dd HH:MM:ss Z'
        } 
    }: undefined,
    base: {
        service: 'authBackend', version: 'beta'
    }
});

export default logger