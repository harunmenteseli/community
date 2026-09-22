import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB } from '../../db';
import { db } from '../../db';
import { notifications, notificationSettings, users } from '../../db/schema';
import { events } from '../../lib/events';

export interface NotificationInput {
  recipientId: string;
  actorId?: string | null;
  type: string;
  entityType: string;
  entityId?: string | null;
  payload?: Record<string, unknown>;
}

const TYPE_TO_SETTING: Record<string, 'follow' | 'like' | 'comment' | 'launch' | 'weeklyDigest'> = {
  follow: 'follow',
  like: 'like',
  bookmark: 'like',
  comment: 'comment',
  reply: 'comment',
  mention: 'comment',
  launch: 'launch',
};

export class NotificationsService {
  constructor(private readonly db: DB) {}

  async create(input: NotificationInput): Promise<void> {
    if (input.recipientId === input.actorId) return;

    const settings = await this.db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, input.recipientId))
      .limit(1);

    const settingKey = TYPE_TO_SETTING[input.type];
    if (settingKey && settings[0] && settings[0][settingKey] === false) return;

    const inserted = await this.db
      .insert(notifications)
      .values({
        recipientId: input.recipientId,
        actorId: input.actorId,
        type: input.type,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload,
      })
      .returning();

    events.emit('notification:new', { recipientId: input.recipientId, notification: inserted[0] });
  }

  async list(userId: string, cursor?: string, requestedLimit = 20) {
    const limit = Math.min(Math.max(requestedLimit, 1), 50);
    const offset = cursor ? Number(cursor) : 0;

    const rows = await this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        entityType: notifications.entityType,
        entityId: notifications.entityId,
        payload: notifications.payload,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        actorId: users.id,
        actorUsername: users.username,
        actorName: users.name,
        actorAvatarUrl: users.avatarUrl,
      })
      .from(notifications)
      .leftJoin(users, eq(users.id, notifications.actorId))
      .where(eq(notifications.recipientId, userId))
      .orderBy(sql`${notifications.createdAt} desc`)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        entityType: n.entityType,
        entityId: n.entityId,
        payload: n.payload,
        readAt: n.readAt,
        createdAt: n.createdAt,
        actor: n.actorId
          ? { id: n.actorId, username: n.actorUsername!, name: n.actorName!, avatarUrl: n.actorAvatarUrl }
          : null,
      })),
      nextCursor: hasMore ? String(offset + limit) : null,
    };
  }

  async unreadCount(userId: string): Promise<number> {
    const row = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
    return Number(row[0]?.count ?? 0);
  }

  async markAllRead(userId: string): Promise<void> {
    await this.db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.recipientId, userId));
    events.emit('notification:read', { recipientId: userId });
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, id), eq(notifications.recipientId, userId)));
  }
}

export const notificationsService = new NotificationsService(db);