import 'dotenv/config';
import { startServer } from './server';
import { closeRedis } from './lib/redis';
import { logger } from './logger';

const { shutdown } = await startServer();

async function graceful(signal: string) {
  logger.info(`Sinyal alındı: ${signal}`);
  try {
    await shutdown();
    await closeRedis();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', () => void graceful('SIGINT'));
process.on('SIGTERM', () => void graceful('SIGTERM'));