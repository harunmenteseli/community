import { and, eq, desc } from 'drizzle-orm';
import type { DB } from '../../db';
import { db } from '../../db';
import { projects, projectImages } from '../../db/schema';
import type { CreateProjectDto } from '@community/shared';
import { errors } from '../../lib/errors';

export type ProjectWithImages = typeof projects.$inferSelect & {
  images: { url: string; type: string; width: number | null; height: number | null; position: number }[];
};

export class ProjectsService {
  constructor(private readonly db: DB) {}

  async create(userId: string, input: CreateProjectDto): Promise<string> {
    const id = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(projects)
        .values({
          userId,
          name: input.name,
          url: input.url,
          category: input.category,
          buildWith: input.buildWith,
          isOpenSource: input.isOpenSource,
          githubUrl: input.isOpenSource ? input.githubUrl : null,
          description: input.description,
          logoUrl: input.logoUrl ?? null,
          launched: input.launched ?? false,
        })
        .returning({ id: projects.id });

      if (input.logoUrl) {
        await tx.insert(projectImages).values({ projectId: created!.id, url: input.logoUrl, type: 'logo', position: 0 });
      }
      if (input.coverUrls?.length) {
        await tx.insert(projectImages).values(
          input.coverUrls.map((url, i) => ({ projectId: created!.id, url, type: 'cover', position: i })),
        );
      }
      return created!.id;
    });
    return id;
  }

  async update(projectId: string, userId: string, input: Partial<CreateProjectDto>): Promise<void> {
    await this.getOwned(projectId, userId);

    await this.db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.buildWith !== undefined ? { buildWith: input.buildWith } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.isOpenSource !== undefined ? { isOpenSource: input.isOpenSource } : {}),
          ...(input.githubUrl !== undefined ? { githubUrl: input.isOpenSource ? input.githubUrl : null } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl ?? null } : {}),
          ...(input.launched !== undefined ? { launched: input.launched } : {}),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      if (input.logoUrl !== undefined) {
        await tx.delete(projectImages).where(and(eq(projectImages.projectId, projectId), eq(projectImages.type, 'logo')));
        if (input.logoUrl) {
          await tx.insert(projectImages).values({ projectId, url: input.logoUrl, type: 'logo', position: 0 });
        }
      }

      if (input.coverUrls !== undefined) {
        await tx.delete(projectImages).where(and(eq(projectImages.projectId, projectId), eq(projectImages.type, 'cover')));
        await tx.insert(projectImages).values(
          input.coverUrls.map((url, i) => ({ projectId, url, type: 'cover', position: i })),
        );
      }
    });
  }

  async delete(projectId: string, userId: string): Promise<void> {
    await this.getOwned(projectId, userId);
    await this.db.delete(projects).where(eq(projects.id, projectId));
  }

  async getById(projectId: string): Promise<ProjectWithImages> {
    const project = await this.db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    if (!project[0]) throw errors.notFound('Proje bulunamadı');
    return this.hydrate(project[0]);
  }

  async listForUser(userId: string): Promise<ProjectWithImages[]> {
    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
    return Promise.all(rows.map((r) => this.hydrate(r)));
  }

  async listLaunched(viewerId: string | undefined, sort: 'yeni' | 'puan' = 'yeni', cursor?: string, limit = 12) {
    void viewerId;
    const take = Math.min(Math.max(limit, 1), 30);

    if (sort === 'puan') {
      const offset = cursor ? Number(cursor) : 0;
      const rows = await this.db
        .select()
        .from(projects)
        .where(eq(projects.launched, true))
        .orderBy(desc(projects.avgRating), desc(projects.ratingCount), desc(projects.createdAt))
        .limit(take + 1)
        .offset(offset);
      const hasMore = rows.length > take;
      return { projects: await Promise.all(rows.slice(0, take).map((r) => this.hydrate(r))), nextCursor: hasMore ? String(offset + take) : null };
    }

    const rows = await this.db
      .select()
      .from(projects)
      .where(eq(projects.launched, true))
      .orderBy(desc(projects.createdAt))
      .limit(take + 1);
    const hasMore = rows.length > take;
    return { projects: await Promise.all(rows.slice(0, take).map((r) => this.hydrate(r))), nextCursor: hasMore ? '1' : null };
  }

  private async getOwned(projectId: string, userId: string) {
    const project = await this.db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
    const found = project[0];
    if (!found) throw errors.notFound('Proje bulunamadı');
    if (found.userId !== userId) throw errors.forbidden();
    return found;
  }

  private async hydrate(p: typeof projects.$inferSelect): Promise<ProjectWithImages> {
    const images = await this.db
      .select({ url: projectImages.url, type: projectImages.type, width: projectImages.width, height: projectImages.height, position: projectImages.position })
      .from(projectImages)
      .where(and(eq(projectImages.projectId, p.id)))
      .orderBy(projectImages.position);
    return { ...p, images };
  }
}

export const projectsService = new ProjectsService(db);