import type { FastifyInstance } from 'fastify';
import { createCommentSchema } from '@community/shared';
import { commentsService } from './service';

export async function registerComments(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/api/posts/:id/comments', async (request) => {
    const { cursor, limit } = request.query as { cursor?: string; limit?: string };
    const result = await commentsService.listForPost(request.params.id, cursor, limit ? Number(limit) : 20);
    return result;
  });

  app.post('/api/comments', async (request, reply) => {
    const { id } = request.requireAuthUser();
    const body = createCommentSchema.parse(request.body);
    const comment = await commentsService.create(id, body);
    return reply.status(201).send({ comment });
  });

  app.delete<{ Params: { id: string } }>('/api/comments/:id', async (request) => {
    const { id } = request.requireAuthUser();
    await commentsService.delete(request.params.id, id);
    return { success: true };
  });
}