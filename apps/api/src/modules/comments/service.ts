import { and, eq, asc, isNull } from 'drizzle-orm';
import type { DB } from '../../db';
import { db } from '../../db';
import { comments, posts, users } from '../../db/schema';
import type { CreateCommentDto } from '@community/shared';
import { errors } from '../../lib/errors';
import { notificationsService } from '../notifications/service';

export interface CommentWithMeta {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; username: string; name: string; avatarUrl: string | null };
  parentId: string | null;
  replyCount?: number;
  replies?: CommentWithMeta[];
}

interface CommentRow {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  parentId: string | null;
  authorId: string;
  authorUsername: string;
  authorName: string;
  authorAvatarUrl: string | null;
}

export class CommentsService {
  constructor(private readonly db: DB) {}

  async listForPost(postId: string, cursor?: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const offset = cursor ? Number(cursor) : 0;

    const rootRows = await this.queryComments(postId, true, take + 1, offset);
    const hasMore = rootRows.length > take;
    const page = hasMore ? rootRows.slice(0, take) : rootRows;

    const rootIds = page.map((r) => r.id);
    const replyRows = rootIds.length
      ? await this.queryCommentsByParents(rootIds)
      : [];

    const replyMap = new Map<string, CommentWithMeta[]>();
    for (const r of replyRows) {
      const list = replyMap.get(r.parentId!) ?? [];
      list.push(this.toComment(r));
      replyMap.set(r.parentId!, list);
    }

    return {
      comments: page.map((r) => ({ ...this.toComment(r), replyCount: (replyMap.get(r.id) ?? []).length, replies: replyMap.get(r.id) ?? [] })),
      nextCursor: hasMore ? (offset + take).toString() : null,
    };
  }

  private async queryComments(postId: string, rootOnly: boolean, limit: number, offset: number): Promise<CommentRow[]> {
    return this.db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        parentId: comments.parentId,
        authorId: users.id,
        authorUsername: users.username,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(and(eq(comments.postId, postId), ...(rootOnly ? [isNull(comments.parentId)] : [])))
      .orderBy(asc(comments.createdAt))
      .limit(limit)
      .offset(offset);
  }

  private async queryCommentsByParents(parentIds: string[]): Promise<CommentRow[]> {
    if (parentIds.length === 0) return [];
    return this.db
      .select({
        id: comments.id,
        content: comments.content,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
        parentId: comments.parentId,
        authorId: users.id,
        authorUsername: users.username,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .where(and(...parentIds.map((id) => eq(comments.parentId, id))))
      .orderBy(asc(comments.createdAt));
  }

  private toComment(r: CommentRow): CommentWithMeta {
    return {
      id: r.id,
      content: r.content,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      parentId: r.parentId,
      author: { id: r.authorId, username: r.authorUsername, name: r.authorName, avatarUrl: r.authorAvatarUrl },
    };
  }

  async create(authorId: string, input: CreateCommentDto): Promise<CommentWithMeta> {
    const post = await this.db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, input.postId)).limit(1);
    if (!post[0]) throw errors.notFound('Post bulunamadı');
    if (input.parentId) {
      const parent = await this.db
        .select({ id: comments.id, postId: comments.postId })
        .from(comments)
        .where(eq(comments.id, input.parentId))
        .limit(1);
      if (!parent[0] || parent[0].postId !== input.postId) throw errors.badRequest('Geçersiz yanıt');
    }

    const [created] = await this.db
      .insert(comments)
      .values({ postId: input.postId, parentId: input.parentId ?? null, authorId, content: input.content })
      .returning();

    // Bildirimler
    await notificationsService.create({
      recipientId: post[0].authorId,
      actorId: authorId,
      type: input.parentId ? 'reply' : 'comment',
      entityType: 'post',
      entityId: input.postId,
      payload: { postId: input.postId, commentId: created!.id, parentId: input.parentId ?? null },
    });

    if (input.parentId) {
      const parentAuthor = (
        await this.db.select({ authorId: comments.authorId }).from(comments).where(eq(comments.id, input.parentId!)).limit(1)
      )[0]?.authorId;
      if (parentAuthor && parentAuthor !== post[0].authorId) {
        await notificationsService.create({
          recipientId: parentAuthor,
          actorId: authorId,
          type: 'reply',
          entityType: 'post',
          entityId: input.postId,
          payload: { postId: input.postId, commentId: created!.id },
        });
      }
    }

    return this.mapComment(created!, authorId);
  }

  async delete(commentId: string, userId: string): Promise<void> {
    const comment = await this.db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
    const found = comment[0];
    if (!found) throw errors.notFound('Yorum bulunamadı');

    const post = await this.db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, found.postId)).limit(1);
    const isPostOwner = post[0]?.authorId === userId;
    const isOwner = found.authorId === userId;
    if (!isOwner && !isPostOwner) throw errors.forbidden();

    await this.db.delete(comments).where(eq(comments.id, commentId));
  }

  private async mapComment(c: { id: string; content: string; createdAt: Date; updatedAt: Date; parentId: string | null; authorId: string }, requesterId?: string): Promise<CommentWithMeta> {
    const author = (await this.db.select().from(users).where(eq(users.id, c.authorId)).limit(1))[0]!;
    return {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      parentId: c.parentId,
      author: { id: author.id, username: author.username, name: author.name, avatarUrl: author.avatarUrl },
    };
  }
}

export const commentsService = new CommentsService(db);