import type { Server as HttpServer } from 'node:http';
import type { FastifyInstance } from 'fastify';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { env } from '../env';
import { logger } from '../logger';
import { db } from '../db';
import { sessions, users } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { hashToken, verifySessionSignature } from './crypto';
import { events } from './events';
import { notificationsService } from '../modules/notifications/service';

export const userSockets = new Map<string, Set<string>>();

const SESSION_PREFIX = 'Bearer ';

async function authenticate(token?: string): Promise<string | null> {
  if (!token || !token.startsWith(SESSION_PREFIX)) return null;
  const [sessionId, userId, signature] = token.slice(SESSION_PREFIX.length).split('.');
  if (!sessionId || !userId || !signature) return null;

  const tokenHash = hashToken(sessionId);
  if (!verifySessionSignature(userId, tokenHash, signature)) return null;

  const row = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .innerJoin(users, and(eq(sessions.userId, users.id), eq(users.isActive, true)))
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .limit(1);

  if (!row[0]) return null;
  const userRow = await db.select({ id: users.id }).from(users).where(eq(users.id, row[0].userId)).limit(1);
  return userRow[0]?.id ?? null;
}

export function attachRealtime(httpServer: HttpServer, _app: FastifyInstance): void {
  const io = new Server(httpServer, {
    cors: { origin: env.APP_URL.split(',').map((o) => o.trim()), credentials: true },
    transports: ['websocket', 'polling'],
  });

  if (env.NODE_ENV === 'production') {
    const pubClient = new Redis(env.REDIS_URL);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  }

  io.use(async (socket, next) => {
    try {
      const userId = await authenticate(socket.handshake.auth?.token as string | undefined);
      if (!userId) {
        return next(new Error('unauthorized'));
      }
      socket.data.userId = userId;
      next();
    } catch (err) {
      next(err as Error);
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId as string;
    const set = userSockets.get(userId) ?? new Set<string>();
    set.add(socket.id);
    userSockets.set(userId, set);

    void notificationsService.unreadCount(userId).then((count) => {
      socket.emit('notifications:unread', { count });
    });

    socket.on('disconnect', () => {
      const s = userSockets.get(userId);
      s?.delete(socket.id);
      if (s?.size === 0) userSockets.delete(userId);
    });
  });

  events.on('notification:new', ({ recipientId, notification }) => {
    const socketIds = userSockets.get(recipientId as string);
    if (!socketIds) return;
    for (const id of socketIds) {
      io.to(id).emit('notification:new', notification);
    }
  });

  events.on('notification:read', ({ recipientId }) => {
    const socketIds = userSockets.get(recipientId as string);
    if (!socketIds) return;
    for (const id of socketIds) {
      io.to(id).emit('notifications:unread', { count: 0 });
    }
  });

  logger.info('Socket.IO realtime hazır');
}