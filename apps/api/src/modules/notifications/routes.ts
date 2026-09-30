import type { FastifyInstance } from 'fastify';
import { notificationSettingsSchema } from '@community/shared';
import { notificationsService } from './service';

export async function registerNotifications(app: FastifyInstance): Promise<void> {
  app.get('/api/notifications', async (request) => {
    const { id } = request.requireAuthUser();
    const { cursor, limit, filter } = request.query as { cursor?: string; limit?: string; filter?: string };
    return notificationsService.list(
      id,
      cursor,
      limit ? Number(limit) : 20,
      filter === 'unread',
    );
  });

  app.get('/api/notifications/unread-count', async (request) => {
    const { id } = request.requireAuthUser();
    return { count: await notificationsService.unreadCount(id) };
  });

  app.post('/api/notifications/read-all', async (request) => {
    const { id } = request.requireAuthUser();
    await notificationsService.markAllRead(id);
    return { success: true };
  });

  app.post<{ Params: { id: string } }>('/api/notifications/:id/read', async (request) => {
    const { id } = request.requireAuthUser();
    await notificationsService.markRead(id, request.params.id);
    return { success: true };
  });

  app.get('/api/notifications/settings', async (request) => {
    const { id } = request.requireAuthUser();
    return { settings: await notificationsService.getSettings(id) };
  });

  app.put('/api/notifications/settings', async (request) => {
    const { id } = request.requireAuthUser();
    const settings = notificationSettingsSchema.parse(request.body);
    return { settings: await notificationsService.updateSettings(id, settings) };
  });

  // Socket.IO bağlantısı: apps/api/src/lib/realtime.ts üzerinden auth header ile doğrulanır.
}