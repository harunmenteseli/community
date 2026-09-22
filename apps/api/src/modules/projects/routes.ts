import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createProjectSchema } from '@community/shared';
import { projectsService } from './service';

const updateProjectSchema = z.object(createProjectSchema.shape).partial().strict();

export async function registerProjects(app: FastifyInstance): Promise<void> {
  app.post('/api/projects', async (request, reply) => {
    const { id } = request.requireAuthUser();
    const body = createProjectSchema.parse(request.body);
    const projectId = await projectsService.create(id, body);
    return reply.status(201).send({ project: { id: projectId } });
  });

  app.get('/api/me/projects', async (request) => {
    const { id } = request.requireAuthUser();
    return { projects: await projectsService.listForUser(id) };
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id', async (request) => {
    const project = await projectsService.getById(request.params.id);
    return { project };
  });

  app.patch<{ Params: { id: string } }>('/api/projects/:id', async (request) => {
    const { id } = request.requireAuthUser();
    const body = updateProjectSchema.parse(request.body);
    await projectsService.update(request.params.id, id, body);
    const project = await projectsService.getById(request.params.id);
    return { project };
  });

  app.delete<{ Params: { id: string } }>('/api/projects/:id', async (request) => {
    const { id } = request.requireAuthUser();
    await projectsService.delete(request.params.id, id);
    return { success: true };
  });
}