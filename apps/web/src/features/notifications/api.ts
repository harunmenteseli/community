import type { NotificationSettingsDto } from '@community/shared';
import { notificationSettingsSchema } from '@community/shared';
import { http } from '../../lib/api';

export interface NotificationActor {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  entityType: string;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  actor: NotificationActor | null;
}

export type NotificationFilter = 'all' | 'unread';

export interface NotificationPage {
  items: AppNotification[];
  nextCursor: string | null;
}

export const notificationsApi = {
  list: (input: { cursor?: string; filter?: NotificationFilter; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (input.cursor) query.set('cursor', input.cursor);
    if (input.filter && input.filter !== 'all') query.set('filter', input.filter);
    if (input.limit) query.set('limit', String(input.limit));
    const search = query.toString();
    return http.get<NotificationPage>(`/api/notifications${search ? `?${search}` : ''}`);
  },
  unreadCount: () => http.get<{ count: number }>('/api/notifications/unread-count'),
  markRead: (id: string) => http.post<{ success: true }>(`/api/notifications/${id}/read`),
  markAllRead: () => http.post<{ success: true }>('/api/notifications/read-all'),
  settings: () => http.get<{ settings: NotificationSettingsDto }>('/api/notifications/settings'),
  updateSettings: (input: Partial<NotificationSettingsDto>) =>
    http.put<{ settings: NotificationSettingsDto }>(
      '/api/notifications/settings',
      // Kismi gonderim de calisir: sema eksik anahtarlari varsayilan doldurur.
      notificationSettingsSchema.parse(input),
    ),
};
