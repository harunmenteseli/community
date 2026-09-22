import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { FastifyBaseLogger } from 'fastify/types/logger';
import { and, eq, gt, gte, isNull } from 'drizzle-orm';
import { db } from '../db';
import { sessions, users } from '../db/schema';
import { hashToken, verifySessionSignature } from '../lib/crypto';
import { errors } from '../lib/errors';

export interface AuthUser {
  id: string;
  sessionId: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    authUser: AuthUser | null;
    requireAuthUser(): AuthUser;
  }
}

const SESSION_HEADER = 'authorization';
const SESSION_PREFIX = 'Bearer ';

export interface SessionSource {
  authUser: AuthUser | null;
}

async function resolveSession(
  request: FastifyRequest,
): Promise<{ authUser: AuthUser | null; sessionId: string | null; userId: string | null } | undefined> {
  const header = request.headers[SESSION_HEADER];
  if (!header || typeof header !== 'string' || !header.startsWith(SESSION_PREFIX)) {
    request.authUser = null;
    return;
  }

  const [sessionId, userId, signature] = header.slice(SESSION_PREFIX.length).split('.');
  if (!sessionId || !userId || !signature) {
    request.authUser = null;
    return;
  }

  const tokenHash = hashToken(sessionId);
  if (!verifySessionSignature(userId, tokenHash, signature)) {
    request.authUser = null;
    return;
  }

  const rows = await db
    .select({ sessionId: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, and(eq(sessions.userId, users.id)))
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  const session = rows[0];
  if (!session) {
    request.authUser = null;
    return;
  }

  // Süresi dolmamış ve kullanıcı aktif mi?
  const user = await db
    .select({ id: users.id, isActive: users.isActive })
    .from(users)
    .where(and(eq(users.id, session.userId), eq(users.isActive, true)))
    .limit(1);

  if (!user[0]) {
    request.authUser = null;
    return;
  }

  request.authUser = { id: session.userId, sessionId: session.sessionId };
}

export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('authUser', null);

  app.addHook('preHandler', (request, _reply, done) => {
    void (async () => {
      try {
        await resolveSession(request);
        done();
      } catch (err) {
        done(err as Error);
      }
    })();
  });

  app.decorateRequest('requireAuthUser', function (this: FastifyRequest) {
    if (!this.authUser) throw errors.unauthorized('Giriş yapmanız gerekiyor');
    return this.authUser;
  });
});