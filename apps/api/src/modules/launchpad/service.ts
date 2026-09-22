import { and, eq, desc, sql } from 'drizzle-orm';
import type { DB } from '../../db';
import { db } from '../../db';
import { projects, launchFeedback, users } from '../../db/schema';
import { errors } from '../../lib/errors';
import { notificationsService } from '../notifications/service';

export interface FeedbackInput {
  rating: number;
  comment?: string;
}

export class LaunchpadService {
  constructor(private readonly db: DB) {}

  async launch(projectId: string, userId: string): Promise<void> {
    const project = await this.owned(projectId, userId);
    if (project.launched) return;
    await this.db.update(projects).set({ launched: true, updatedAt: new Date() }).where(eq(projects.id, projectId));
  }

  async unlaunch(projectId: string, userId: string): Promise<void> {
    await this.owned(projectId, userId);
    await this.db.update(projects).set({ launched: false, updatedAt: new Date() }).where(eq(projects.id, projectId));
  }

  async feedback(projectId: string, userId: string, input: FeedbackInput): Promise<void> {
    if (input.rating < 1 || input.rating > 5) throw errors.badRequest('Puan 1-5 arası olmalı');

    const project = await this.db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const found = project[0];
    if (!found) throw errors.notFound('Proje bulunamadı');
    if (found.userId === userId) throw errors.badRequest('Kendi projene puan veremezsin');

    const existing = await this.db
      .select()
      .from(launchFeedback)
      .where(and(eq(launchFeedback.projectId, projectId), eq(launchFeedback.userId, userId)))
      .limit(1);

    if (existing[0]) {
      const delta = input.rating - existing[0].rating;
      await this.db
        .update(launchFeedback)
        .set({ rating: input.rating, comment: input.comment ?? null, updatedAt: new Date() })
        .where(eq(launchFeedback.id, existing[0].id));

      await this.db.execute(
        sql`UPDATE projects SET avg_rating = GREATEST(0, avg_rating + ${delta}), updated_at = now() WHERE id = ${projectId}`,
      );
    } else {
      await this.db.insert(launchFeedback).values({ projectId, userId, rating: input.rating, comment: input.comment ?? null });
      await this.db
        .update(projects)
        .set({
          avgRating: Math.round(((found.avgRating * found.ratingCount + input.rating) / (found.ratingCount + 1)) * 10) / 10,
          ratingCount: found.ratingCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      if (input.comment) {
        await notificationsService.create({
          recipientId: found.userId,
          actorId: userId,
          type: 'launch',
          entityType: 'project',
          entityId: projectId,
          payload: { projectId, rating: input.rating },
        });
      }
    }
  }

  async listFeedback(projectId: string, cursor?: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const offset = cursor ? Number(cursor) : 0;
    const rows = await this.db
      .select({
        id: launchFeedback.id,
        rating: launchFeedback.rating,
        comment: launchFeedback.comment,
        createdAt: launchFeedback.createdAt,
        userId: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(launchFeedback)
      .innerJoin(users, eq(users.id, launchFeedback.userId))
      .where(eq(launchFeedback.projectId, projectId))
      .orderBy(desc(launchFeedback.createdAt))
      .limit(take + 1)
      .offset(offset);

    const hasMore = rows.length > take;
    return {
      feedback: rows.slice(0, take).map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        author: { id: r.userId, username: r.username, name: r.name, avatarUrl: r.avatarUrl },
      })),
      nextCursor: hasMore ? String(offset + take) : null,
    };
  }

  async myFeedback(projectId: string, userId: string) {
    const row = await this.db.select().from(launchFeedback).where(and(eq(launchFeedback.projectId, projectId), eq(launchFeedback.userId, userId))).limit(1);
    return row[0] ?? null;
  }

  private async owned(projectId: string, userId: string) {
    const project = (await this.db.select().from(projects).where(eq(projects.id, projectId)).limit(1))[0];
    if (!project) throw errors.notFound('Proje bulunamadı');
    if (project.userId !== userId) throw errors.forbidden();
    return project;
  }
}

export const launchpadService = new LaunchpadService(db);