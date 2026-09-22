import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@community/shared';
import { errors } from '../../lib/errors';
import { authService } from './service';
import { toUserPublic, toUserPublicByEmail, toUserPublicById } from '../users/mapper';
import { exchangeGithubCode, getGithubUser } from './github';
import { users, oauthAccounts } from '../../db/schema';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { env } from '../../env';

export async function registerAuth(app: FastifyInstance): Promise<void> {
  app.post('/api/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await authService.register(body, request.ip, request.headers['user-agent']);
    const user = await toUserPublic(body.username);
    return reply.status(201).send({ token: result.token, session: result.session, user });
  });

  app.post('/api/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body, request.ip, request.headers['user-agent']);
    const user = await toUserPublicByEmail(body.email);
    return reply.send({ token: result.token, session: result.session, user });
  });

  app.post('/api/auth/logout', async (request) => {
    const session = request.authUser?.sessionId;
    if (session) await authService.revokeSession(session, request.authUser!.id);
    return { success: true };
  });

  app.get('/api/auth/me', async (request) => {
    const { id } = request.requireAuthUser();
    return { user: await toUserPublicById(id) };
  });

  app.post('/api/auth/verify-email', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request) => {
    const { token } = request.body as { token: string };
    if (!token) throw errors.badRequest('Token gerekli');
    await authService.verifyEmail(token);
    return { success: true };
  });

  app.post(
    '/api/auth/resend-verification',
    { config: { rateLimit: { max: 3, timeWindow: '5 minutes' } } },
    async (request) => {
      const { email } = request.body as { email: string };
      await authService.resendVerification(email.toLowerCase());
      return { success: true };
    },
  );

  app.post(
    '/api/auth/forgot-password',
    { config: { rateLimit: { max: 3, timeWindow: '5 minutes' } } },
    async (request) => {
      const { email } = forgotPasswordSchema.parse(request.body);
      await authService.forgotPassword(email);
      return { success: true };
    },
  );

  app.post('/api/auth/reset-password', async (request) => {
    const body = resetPasswordSchema.parse(request.body);
    await authService.resetPassword(body.token, body.password);
    return { success: true };
  });

  app.get('/api/auth/sessions', async (request) => {
    const { id } = request.requireAuthUser();
    return { sessions: await authService.listSessions(id) };
  });

  app.post('/api/auth/sessions/revoke-all', async (request) => {
    const { id, sessionId } = request.requireAuthUser();
    await authService.revokeAllSessions(id, sessionId);
    return { success: true };
  });

  app.post<{ Params: { id: string } }>('/api/auth/sessions/:id/revoke', async (request) => {
    const { id } = request.requireAuthUser();
    await authService.revokeSession(request.params.id, id);
    return { success: true };
  });

  // ---- GitHub OAuth ----
  app.get('/api/auth/github', async (_request, reply) => {
    if (!env.GITHUB_CLIENT_ID) throw errors.internal('GitHub OAuth yapılandırılmamış');
    const params = new URLSearchParams({
      client_id: env.GITHUB_CLIENT_ID,
      redirect_uri: env.GITHUB_CALLBACK_URL!,
      scope: 'read:user user:email',
      allow_signup: 'true',
    });
    return reply.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
  });

  app.get('/api/auth/github/callback', async (request, reply) => {
    const { code } = request.query as { code?: string };
    if (!code) throw errors.badRequest('GitHub onay kodu eksik');

    const accessToken = await exchangeGithubCode(code);
    const ghUser = await getGithubUser(accessToken);

    const existing = await db
      .select({ userId: oauthAccounts.userId })
      .from(oauthAccounts)
      .where(and(eq(oauthAccounts.provider, 'github'), eq(oauthAccounts.providerAccountId, String(ghUser.id))))
      .limit(1);

    let userId: string;
    if (existing[0]) {
      userId = existing[0].userId;
    } else {
      const email = ghUser.email ?? (ghUser.emails?.find((e) => e.primary)?.email ?? null);
      const existingEmail = email
        ? ((await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1))[0]?.id ?? null)
        : null;

      if (existingEmail) {
        userId = existingEmail;
      } else {
        const username = await ensureUniqueUsername(ghUser.login);
        const created = await db
          .insert(users)
          .values({
            email: email ?? `${ghUser.login}@github.local`,
            username,
            name: ghUser.name ?? ghUser.login,
            passwordHash: null,
            avatarUrl: ghUser.avatar_url,
            githubUsername: ghUser.login,
            emailVerifiedAt: email ? new Date() : null,
          })
          .returning({ id: users.id });
        userId = created[0]!.id;
      }
      await db.insert(oauthAccounts).values({
        userId,
        provider: 'github',
        providerAccountId: String(ghUser.id),
      });
    }

    const session = await authService.issueSession(userId, request.ip, request.headers['user-agent']);

    // fragment ile yönlendirme: token sunucuya hiç yazılmaz
    return reply.redirect(`${env.APP_URL}/auth/oauth/github#token=${session.token}`);
  });
}

async function ensureUniqueUsername(base: string): Promise<string> {
  const candidate = base.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30) || 'dev';
  for (let i = 0; i < 20; i++) {
    const name = i === 0 ? candidate : `${candidate}${i + 1}`;
    const exists = await db.select({ id: users.id }).from(users).where(eq(users.username, name)).limit(1);
    if (!exists[0]) return name;
  }
  throw errors.conflict('Kullanıcı adı oluşturulamadı');
}