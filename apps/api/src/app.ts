import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { logger } from './logger';
import { env } from './env';
import { registerErrorHandler } from './plugins/errorHandler';
import { authPlugin } from './plugins/auth';
import { redis } from './lib/redis';
import { registerHealth } from './modules/health/routes';
import { registerAuth } from './modules/auth/routes';
import { registerUsers } from './modules/users/routes';
import { registerPosts } from './modules/posts/routes';
import { registerFeed } from './modules/feed/routes';
import { registerComments } from './modules/comments/routes';
import { registerProjects } from './modules/projects/routes';
import { registerLaunchpad } from './modules/launchpad/routes';
import { registerNotifications } from './modules/notifications/routes';
import { registerUploads } from './modules/uploads/routes';
import { registerAi } from './modules/ai/routes';

export interface BuildOptions {
  opts?: FastifyServerOptions;
}

export async function buildApp(options: BuildOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: logger as never,
    trustProxy: true,
    bodyLimit: 10 * 1024 * 1024,
    ...options.opts,
  });

  await app.register(cors, {
    origin: env.APP_URL.split(',').map((o) => o.trim()),
    credentials: true,
  });

  await app.register(multipart, {
    limits: { fileSize: 6 * 1024 * 1024, files: 6 },
  });

  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
    allowList: [],
    redis: env.NODE_ENV === 'production' ? redis : undefined,
    errorResponseBuilder: () => ({
      error: { code: 'RATE_LIMITED', message: 'Çok fazla istek. Lütfen biraz bekleyin.' },
    }),
  });

  await app.register(authPlugin);

  registerErrorHandler(app);

  // Modüller
  await registerHealth(app);
  await registerAuth(app);
  await registerUsers(app);
  await registerPosts(app);
  await registerFeed(app);
  await registerComments(app);
  await registerProjects(app);
  await registerLaunchpad(app);
  await registerNotifications(app);
  await registerUploads(app);
  await registerAi(app);

  return app;
}