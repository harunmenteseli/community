import type { FastifyInstance } from 'fastify';
import { errors } from '../../lib/errors';
import { reportsService, type ReportTargetType } from './service';

export async function registerReports(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { targetType?: string; targetId?: string; reason?: string; message?: string } }>(
    '/api/reports',
    async (request, reply) => {
      const { id, role } = request.requireAuthUser();
      if (role === 'admin') throw errors.forbidden('Yoneticiler sikayet gonderemez');

      const body = request.body ?? {};
      const report = await reportsService.create(id, {
        targetType: body.targetType as ReportTargetType,
        targetId: body.targetId ?? '',
        reason: body.reason as never,
        message: body.message,
      });
      return reply.code(201).send({ report });
    },
  );

  app.get('/api/reports/mine', async (request) => {
    const { id } = request.requireAuthUser();
    const { limit } = request.query as { limit?: string };
    return { reports: await reportsService.listForReporter(id, limit ? Number(limit) : 20) };
  });

  // S-6: yonetici raporu sonuclandirir, raporlayan kullaniciya bildirim gider.
  app.post<{ Params: { id: string }; Body: { status?: string } }>(
    '/api/reports/:id/resolve',
    async (request) => {
      const { id, role } = request.requireAuthUser();
      if (role !== 'admin') throw errors.forbidden('Bu islem icin yetkin yok');
      const status = request.body?.status ?? '';
      return { report: await reportsService.resolve(id, request.params.id, status) };
    },
  );
}
