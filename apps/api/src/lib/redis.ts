import 'dotenv/config';
import { Redis } from 'ioredis';
import { env } from '../env';
import { logger } from '../logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  enableOfflineQueue: true,
});

redis.on('error', (err) => logger.error({ err }, 'Redis bağlantı hatası'));
redis.on('connect', () => logger.info('Redis bağlı'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

export async function closeRedis(): Promise<void> {
  await redis.quit();
}

export const cacheTtl = {
  userByUsername: 60,
  githubPinned: 300,
  githubContributions: 300,
  trending: 60,
} as const;