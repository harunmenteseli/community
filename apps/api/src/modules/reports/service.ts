import { and, desc, eq } from 'drizzle-orm';
import type { DB } from '../../db';
import { db } from '../../db';
import { posts, projects, reports, users } from '../../db/schema';
import { errors } from '../../lib/errors';
import { notificationsService } from '../notifications/service';

export const REPORT_TARGET_TYPES = ['post', 'user', 'project'] as const;
export const REPORT_REASONS = ['spam', 'abuse', 'scam', 'nsfw', 'other'] as const;
export const REPORT_STATUSES = ['approved', 'rejected'] as const;

export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportStatus = 'pending' | (typeof REPORT_STATUSES)[number];

export interface CreateReportInput {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  message?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class ReportsService {
  constructor(private readonly db: DB) {}

  async create(reporterId: string, input: CreateReportInput) {
    const targetType = String(input.targetType) as ReportTargetType;
    if (!REPORT_TARGET_TYPES.includes(targetType)) throw errors.badRequest('Gecersiz hedef turu');
    const targetId = String(input.targetId ?? '');
    if (!UUID_PATTERN.test(targetId)) throw errors.badRequest('Gecersiz hedef');

    const reason = String(input.reason) as ReportReason;
    if (!REPORT_REASONS.includes(reason)) throw errors.badRequest('Gecersiz sebep');

    const message = input.message === undefined ? undefined : String(input.message).trim();
    if (message !== undefined && message.length > 1000) throw errors.badRequest('Aciklama en fazla 1000 karakter olabilir');
    if (reason === 'other' && !message) throw errors.badRequest('Sebep "Diger" ise aciklama zorunlu');
    const note = message ? message : undefined;

    if (targetType === 'user' && targetId === reporterId) {
      throw errors.badRequest('Kendini sikayet edemezsin');
    }

    const exists = await this.targetExists(targetType, targetId);
    if (!exists) throw errors.notFound('Sikayet edilen icerik bulunamadi');

    const pending = await this.pendingFor(reporterId, targetType, targetId);
    if (pending) throw errors.conflict('Bu icerik icin zaten bekleyen bir sikayetin var');

    return this.insert(reporterId, targetType, targetId, reason, note);
  }

  async resolve(adminId: string, reportId: string, status: string) {
    const value = String(status) as ReportStatus;
    if (!REPORT_STATUSES.includes(value as (typeof REPORT_STATUSES)[number])) {
      throw errors.badRequest('Gecersiz sonuc');
    }

    const rows = await this.db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
    const report = rows[0];
    if (!report) throw errors.notFound('Sikayet bulunamadi');
    if (report.status !== 'pending') throw errors.conflict('Sikayet zaten sonuclandirilmis');

    await this.db
      .update(reports)
      .set({ status: value, resolvedBy: adminId, resolvedAt: new Date() })
      .where(eq(reports.id, reportId));

    // S-6: rapor sonucu, raporlayan kullaniciya bildirim olarak gider.
    // actorId null: bildirim bir kullanici eylemi degil, sistem/moderasyon
    // sonucu; kendine bildirim filtrelenmesi devreye girmemeli.
    await notificationsService.create({
      recipientId: report.reporterId,
      actorId: null,
      type: 'reportUpdate',
      entityType: 'report',
      entityId: report.id,
      payload: { status: value, targetType: report.targetType, targetId: report.targetId },
    });

    return { id: report.id, status: value };
  }

  async listForReporter(reporterId: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    return this.db
      .select({
        id: reports.id,
        targetType: reports.targetType,
        reason: reports.reason,
        status: reports.status,
        createdAt: reports.createdAt,
        resolvedAt: reports.resolvedAt,
      })
      .from(reports)
      .where(eq(reports.reporterId, reporterId))
      .orderBy(desc(reports.createdAt))
      .limit(take);
  }

  private async insert(
    reporterId: string,
    targetType: ReportTargetType,
    targetId: string,
    reason: ReportReason,
    message: string | undefined,
  ) {
    const inserted = await this.db
      .insert(reports)
      .values({ reporterId, targetType, targetId, reason, message })
      .returning();
    const row = inserted[0];
    if (!row) throw errors.internal('Sikayet kaydedilemedi');
    return {
      id: row.id,
      targetType: row.targetType,
      reason: row.reason,
      status: row.status,
      createdAt: row.createdAt,
    };
  }

  private async pendingFor(reporterId: string, targetType: ReportTargetType, targetId: string) {
    const rows = await this.db
      .select({ id: reports.id })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, reporterId),
          eq(reports.targetType, targetType),
          eq(reports.targetId, targetId),
          eq(reports.status, 'pending'),
        ),
      )
      .limit(1);
    return rows[0];
  }

  private async targetExists(targetType: ReportTargetType, targetId: string): Promise<boolean> {
    if (targetType === 'user') {
      const rows = await this.db.select({ id: users.id }).from(users).where(eq(users.id, targetId)).limit(1);
      return rows.length > 0;
    }
    if (targetType === 'post') {
      const rows = await this.db.select({ id: posts.id }).from(posts).where(eq(posts.id, targetId)).limit(1);
      return rows.length > 0;
    }
    const rows = await this.db.select({ id: projects.id }).from(projects).where(eq(projects.id, targetId)).limit(1);
    return rows.length > 0;
  }
}

export const reportsService = new ReportsService(db);
