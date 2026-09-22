import type { FastifyInstance } from 'fastify';
import { createPostSchema, updatePostSchema } from '@community/shared';
import { postsService } from './service';

export async function registerPosts(app: FastifyInstance): Promise<void> {
  app.post('/api/posts', async (request, reply) => {
    const { id } = request.requireAuthUser();
    const body = createPostSchema.parse(request.body);
    const postId = await postsService.create(id, body);
    return reply.status(201).send({ post: { id: postId } });
  });

  app.patch<{ Params: { id: string } }>('/api/posts/:id', async (request) => {
    const { id } = request.requireAuthUser();
    const body = updatePostSchema.parse(request.body);
    await postsService.update(request.params.id, id, body);
    return { success: true };
  });

  app.delete<{ Params: { id: string } }>('/api/posts/:id', async (request) => {
    const { id } = request.requireAuthUser();
    await postsService.delete(request.params.id, id);
    return { success: true };
  });

  app.get<{ Params: { id: string } }>('/api/posts/:id', async (request) => {
    const viewerId = request.authUser?.id;
    const post = await postsService.getById(request.params.id, viewerId);
    return { post };
  });

  app.get('/api/me/drafts', async (request) => {
    const { id } = request.requireAuthUser();
    return { posts: await postsService.listDrafts(id) };
  });

  app.post<{ Params: { id: string } }>('/api/posts/:id/like', async (request) => {
    const { id } = request.requireAuthUser();
    return postsService.toggleLike(request.params.id, id);
  });

  app.post<{ Params: { id: string } }>('/api/posts/:id/bookmark', async (request) => {
    const { id } = request.requireAuthUser();
    return postsService.toggleBookmark(request.params.id, id);
  });

  app.post<{ Params: { id: string }; Body: { optionId: string } }>('/api/posts/:id/poll/vote', async (request) => {
    const { id } = request.requireAuthUser();
    if (!request.body?.optionId) throw new Error('optionId gerekli');
    const poll = await postsService.voteOnPoll(request.params.id, id, request.body.optionId);
    return { poll };
  });
}