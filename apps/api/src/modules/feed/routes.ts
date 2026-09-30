import type { FastifyInstance } from 'fastify';
import { feedParamsSchema } from '@community/shared';
import { postsService } from '../posts/service';
import { redis } from '../../lib/redis';

export async function registerFeed(app: FastifyInstance): Promise<void> {
  app.get('/api/feed', async (request) => {
    const { filter, cursor, limit, category, game } = feedParamsSchema.parse(request.query);
    const viewerId = request.authUser?.id;

    // Redis onbellegi sadece filtresiz ilk "trend" sayfasi icin anlamli.
    const cacheable = filter === 'trend' && !cursor && !category && !game;

    if (cacheable) {
      const cached = await redis.get('feed:trend:top').catch(() => null);
      if (cached) return JSON.parse(cached);
    }

    const result = await postsService.feed(viewerId, filter, cursor, limit, { category, game });

    if (cacheable) {
      await redis.set('feed:trend:top', JSON.stringify(result), 'EX', 60).catch(() => undefined);
    }

    return result;
  });
}
