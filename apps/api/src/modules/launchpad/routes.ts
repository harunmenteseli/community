import type { FastifyInstance } from 'fastify';
import { projectsService } from '../projects/service';
import { launchpadService } from './service';
import { db } from '../../db';
import { users } from '../../db/schema';
import { eq, inArray } from 'drizzle-orm';
import { errors } from '../../lib/errors';

export async function registerLaunchpad(app: FastifyInstance): Promise<void> {
  app.get('/api/launchpad', async (request) => {
    const { sort, cursor, limit } = request.query as { sort?: 'yeni' | 'puan'; cursor?: string; limit?: string };
    const viewerId = request.authUser?.id;
    const result = await projectsService.listLaunched(viewerId, sort, cursor, limit ? Number(limit) : 12);
    // Liste yanitinda da sahip bilgisi gerekiyor: kartta yazar linki ve
    // "kendi kaydimi vitrinden kaldir" butonu bu bilgiye bakiyor.
    const owners = await loadOwners(result.projects);
    return {
      projects: result.projects.map((project) => ({ ...project, owner: owners.get(project.userId) ?? null })),
      nextCursor: result.nextCursor,
    };
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

/** Proje sahiplerini tek sorguda getirir; liste kartlarinda yazar gosterimi icin. */
async function loadOwners(projects: { userId: string }[]) {
  const ids = [...new Set(projects.map((project) => project.userId))];
  if (ids.length === 0) return new Map<string, OwnerRow>();
  const rows = await db
    .select({ id: users.id, username: users.username, name: users.name, avatarUrl: users.avatarUrl, bio: users.bio })
    .from(users)
    .where(inArray(users.id, ids));
  return new Map(rows.map((row) => [row.id, row]));
}

type OwnerRow = {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
};