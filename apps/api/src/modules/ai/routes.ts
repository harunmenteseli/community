import type { FastifyInstance } from 'fastify';
import { listDigests, getDigestBySlug, runDigest, ensureBotUser } from './digest-job';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { errors } from '../../lib/errors';

export async function registerAi(app: FastifyInstance): Promise<void> {
  await ensureBotUser().catch(() => undefined);

  app.get('/api/ai/digests', async () => {
    return { digests: await listDigests() };
  });

  app.get<{ Params: { slug: string } }>('/api/ai/digests/:slug', async (request) => {
    return { digest: await getDigestBySlug(request.params.slug) };
  });

  // Geliştirme/manual trigger — üretimde rol koruması
  app.post('/api/ai/generate', async (request) => {
    const { id } = request.requireAuthUser();
    const user = (await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1))[0];
    if (!user) throw errors.unauthorized();
    if (!['admin', 'bot'].includes(user.role) && process.env.NODE_ENV !== 'development') {
      throw errors.forbidden('Bu işlem için admin yetkisi gerekli');
    }
    const result = await runDigest();
    return result;
  });
}