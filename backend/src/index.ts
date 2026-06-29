import { httpServer } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './db';
import { logger } from './utils/logger';
import { closeRedis } from './services/redis';

async function startServer(): Promise<void> {
  await connectDatabase();

  httpServer.listen(config.port, () => {
    logger.info(`Famora API running on port ${config.port}`, {
      env: config.nodeEnv,
      version: config.apiVersion,
    });
  });
}

async function shutdown(signal: string): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);
  httpServer.close(async () => {
    await disconnectDatabase();
    await closeRedis();
    process.exit(0);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : 'Unknown',
  });
  process.exit(1);
});

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});
