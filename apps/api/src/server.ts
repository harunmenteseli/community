import { createServer } from 'node:http';
import { buildApp } from './app';
import { env } from './env';
import { logger } from './logger';
import { attachRealtime } from './lib/realtime';
import { connectRedis } from './lib/redis';
import { startDigestScheduler } from './modules/ai/scheduler';

export async function startServer(): Promise<{ shutdown: () => Promise<void> }> {
  await connectRedis();

  const httpServer = createServer();

  const app = await buildApp({
    opts: {
      serverFactory: (handler) => {
        httpServer.on('request', handler);
        return httpServer as never;
      },
    },
  });

  attachRealtime(httpServer, app);

  await app.listen({ port: env.PORT, host: env.HOST });
  logger.info(`API ${env.API_URL} adresinde çalışıyor (${env.NODE_ENV})`);

  if (env.NODE_ENV !== 'test') {
    startDigestScheduler();
  }

  const shutdown = async () => {
    logger.info('Kapanıyor…');
    await app.close();
    httpServer.close();
  };

  return { shutdown };
}