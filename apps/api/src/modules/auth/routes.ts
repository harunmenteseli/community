import type { FastifyInstance } from 'fastify';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '@community/shared';
import { errors } from '../../lib/errors';
import { authService } from './service';
import { toUserPublic, toUserPublicByEmail, toUserPublicById } from '../users/mapper';

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
}