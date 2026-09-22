import type { FastifyInstance } from 'fastify';
import { projectsService } from '../projects/service';
import { launchpadService } from './service';
import { db } from '../../db';
import { projects, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { errors } from '../../lib/errors';

export async function registerLaunchpad(app: FastifyInstance): Promise<void> {
  app.get('/api/launchpad', async (request) => {
    const { sort, cursor, limit } = request.query as { sort?: 'yeni' | 'puan'; cursor?: string; limit?: string };
    const viewerId = request.authUser?.id;
    const result = await projectsService.listLaunched(viewerId, sort, cursor, limit ? Number(limit) : 12);
    return result;
  });

  app.get<{ Params: { id: string } }>('/api/launchpad/:id', async (request) => {
    const project = await projectsService.getById(request.params.id);
    if (!project.launched) throw errors.notFound('Proje yayında değil');
    const feedbackPage = await launchpadService.listFeedback(request.params.id);
    const myFeedback = request.authUser?.id ? await launchpadService.myFeedback(request.params.id, request.authUser.id) : null;
    const owner = (await db.select().from(users).where(eq(users.id, project.userId)).limit(1))[0] ?? null;
    return {
      project: {
        ...project,
        owner: owner
          ? { id: owner.id, username: owner.username, name: owner.name, avatarUrl: owner.avatarUrl, bio: owner.bio }
          : null,
      },
      feedback: feedbackPage.feedback,
      feedbackNextCursor: feedbackPage.nextCursor,
      myFeedback,
    };
  });

  app.post<{ Params: { id: string } }>('/api/launchpad/:id/launch', async (request) => {
    const { id } = request.requireAuthUser();
    await launchpadService.launch(request.params.id, id);
    return { success: true };
  });

  app.post<{ Params: { id: string } }>('/api/launchpad/:id/unlaunch', async (request) => {
    const { id } = request.requireAuthUser();
    await launchpadService.unlaunch(request.params.id, id);
    return { success: true };
  });

  app.post<{ Params: { id: string }; Body: { rating: number; comment?: string } }>('/api/launchpad/:id/feedback', async (request) => {
    const { id } = request.requireAuthUser();
    const { rating, comment } = request.body ?? {};
    if (typeof rating !== 'number') throw errors.badRequest('Puan gerekli');
    await launchpadService.feedback(request.params.id, id, { rating, comment });
    return { success: true };
  });

  // launchpad proje içeriği (yorumlar için)
  app.get<{ Params: { id: string } }>('/api/launchpad/:id/feedback', async (request) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    return launchpadService.listFeedback(request.params.id, cursor, limit ? Number(limit) : 20);
  });
}