import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB } from '../../db';
import { db } from '../../db';
import {
  posts,
  postImages,
  postPolls,
  pollVotes,
  postLikes,
  bookmarks,
  users,
} from '../../db/schema';
import type { CreatePostDto, UpdatePostDto } from '@community/shared';
import { POST_CATEGORIES, POST_CONTENT_MAX } from '@community/shared';
import { errors } from '../../lib/errors';
import { events } from '../../lib/events';
import { notificationsService } from '../notifications/service';
import { nanoid } from 'nanoid';

export interface PostWithMeta {
  id: string;
  title: string | null;
  content: string;
  category: (typeof POST_CATEGORIES)[number];
  source: 'human' | 'ai';
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; username: string; name: string; avatarUrl: string | null; githubUsername: string | null };
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  followedByMe: boolean;
  images: { url: string; alt: string | null; width: number | null; height: number | null }[];
  poll: PollWithState | null;
}

export interface PollWithState {
  id: string;
  question: string;
  totalVotes: number;
  myVote: string | null;
  options: { id: string; text: string; votes: number; percentage: number }[];
  closed: boolean;
}

function feedBaseSql(viewerId: string) {
  return sql`
    SELECT
      p.id, p.title, p.content, p.category, p.source, p.created_at, p.updated_at,
      u.id AS author_id, u.username, u.name, u.avatar_url, u.github_username,
      (SELECT count(*) FROM post_likes l WHERE l.post_id = p.id) AS like_count,
      (SELECT count(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
      (SELECT count(*) FROM bookmarks b WHERE b.post_id = p.id) AS bookmark_count,
      EXISTS(SELECT 1 FROM post_likes ml WHERE ml.post_id = p.id AND ml.user_id = ${viewerId}) AS liked_by_me,
      EXISTS(SELECT 1 FROM bookmarks mb WHERE mb.post_id = p.id AND mb.user_id = ${viewerId}) AS bookmarked_by_me,
      EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ${viewerId} AND f.following_id = p.author_id) AS followed_by_me
    FROM posts p
    JOIN users u ON u.id = p.author_id
    WHERE p.is_draft = false
  `;
}

export class PostsService {
  constructor(private readonly db: DB) {}

  async create(authorId: string, input: CreatePostDto): Promise<string> {
    if (input.content.length > POST_CONTENT_MAX) throw errors.badRequest('İçerik çok uzun');

    return this.db.transaction(async (tx) => {
      const [post] = await tx
        .insert(posts)
        .values({
          authorId,
          title: input.title || null,
          content: input.content,
          category: input.category,
          isDraft: input.isDraft ?? false,
        })
        .returning({ id: posts.id });

      if (input.images?.length) {
        await tx.insert(postImages).values(
          input.images.map((url, position) => ({ postId: post!.id, url, position })),
        );
      }

      if (input.poll) {
        await tx.insert(postPolls).values({
          postId: post!.id,
          question: input.poll.question,
          options: input.poll.options.map((o) => ({ id: nanoid(8), text: o.text })),
        });
      }

      return post!.id;
    });
  }

  async update(postId: string, userId: string, input: UpdatePostDto): Promise<void> {
    const post = await this.getOwned(postId, userId);

    await this.db.transaction(async (tx) => {
      await tx
        .update(posts)
        .set({
          title: input.title ?? undefined === undefined ? undefined : input.title ?? post.title,
          content: input.content ?? post.content,
          category: input.category ?? post.category,
          updatedAt: new Date(),
        })
        .where(eq(posts.id, postId));

      if (input.images) {
        await tx.delete(postImages).where(eq(postImages.postId, postId));
        if (input.images.length) {
          await tx.insert(postImages).values(input.images.map((url, position) => ({ postId, url, position })));
        }
      }

      if (input.poll) {
        const existing = await tx.select().from(postPolls).where(eq(postPolls.postId, postId)).limit(1);
        if (existing[0]) {
          await tx.delete(pollVotes).where(eq(pollVotes.pollId, existing[0].id));
          await tx.delete(postPolls).where(eq(postPolls.id, existing[0].id));
        }
        await tx.insert(postPolls).values({
          postId,
          question: input.poll.question,
          options: input.poll.options.map((o) => ({ id: nanoid(8), text: o.text })),
        });
      }
    });
  }

  async delete(postId: string, userId: string): Promise<void> {
    await this.getOwned(postId, userId);
    await this.db.delete(posts).where(eq(posts.id, postId));
  }

  async getById(postId: string, viewerId?: string): Promise<PostWithMeta> {
    const rows = await this.db.execute<PostWithMetaRow>(sql`
      ${feedBaseSql(viewerId ?? '')}
      AND p.id = ${postId}
      LIMIT 1
    `);
    const row = rows[0];
    if (!row) throw errors.notFound('Post bulunamadı');
    return this.toPostWithMeta(row, postId, viewerId);
  }

  async listDrafts(userId: string) {
    const rows = await this.db.execute<PostWithMetaRow>(sql`
      ${feedBaseSql(userId)}
      AND p.author_id = ${userId} AND p.is_draft = true
      ORDER BY p.updated_at DESC
    `);
    return Promise.all(rows.map((r) => this.toPostWithMeta(r, r.id, userId)));
  }

  async feed(viewerId: string | undefined, filter: 'yeni' | 'trend' | 'takip', cursor?: string, limit = 20) {
    const take = Math.min(Math.max(limit, 1), 50);
    const base = feedBaseSql(viewerId ?? '');
    let rows: PostWithMetaRow[];

    if (filter === 'trend') {
      const offset = cursor ? Number(cursor) : 0;
      rows = await this.db.execute<PostWithMetaRow>(sql`
        ${base}
        ORDER BY
          ((SELECT count(*) FROM post_likes l WHERE l.post_id = p.id AND l.created_at > now() - interval '7 days') * 2
           + (SELECT count(*) FROM comments c WHERE c.post_id = p.id AND c.created_at > now() - interval '7 days')) DESC,
          p.created_at DESC, p.id DESC
        OFFSET ${offset} LIMIT ${take + 1}
      `);
      const hasMore = rows.length > take;
      const page = hasMore ? rows.slice(0, take) : rows;
      return {
        posts: await Promise.all(page.map((r) => this.toPostWithMeta(r, r.id, viewerId))),
        nextCursor: hasMore ? String(offset + take) : null,
      };
    }

    const decoded = cursor ? this.decodeCursor(cursor) : null;
    const cursorClause =
      decoded && typeof decoded.createdAt === 'string' && typeof decoded.id === 'string'
        ? sql`AND (p.created_at, p.id) < (${decoded.createdAt}::timestamptz, ${decoded.id})`
        : sql``;

    if (filter === 'takip') {
      if (!viewerId) return { posts: [], nextCursor: null };
      rows = await this.db.execute<PostWithMetaRow>(sql`
        ${base}
        AND EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ${viewerId} AND f.following_id = p.author_id)
        ${cursorClause}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ${take + 1}
      `);
    } else {
      rows = await this.db.execute<PostWithMetaRow>(sql`
        ${base}
        ${cursorClause}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ${take + 1}
      `);
    }

    const hasMore = rows.length > take;
    const page = hasMore ? rows.slice(0, take) : rows;
    const last = page[page.length - 1];

    return {
      posts: await Promise.all(page.map((r) => this.toPostWithMeta(r, r.id, viewerId))),
      nextCursor:
        hasMore && last
          ? Buffer.from(JSON.stringify({ createdAt: last.created_at.toISOString(), id: last.id })).toString('base64url')
          : null,
    };
  }

  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean }> {
    const exists = await this.db
      .select({ id: postLikes.id })
      .from(postLikes)
      .where(and(eq(postLikes.postId, postId), eq(postLikes.userId, userId)))
      .limit(1);

    if (exists[0]) {
      await this.db.delete(postLikes).where(eq(postLikes.id, exists[0].id));
      return { liked: false };
    }

    const post = await this.db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId)).limit(1);
    if (!post[0]) throw errors.notFound('Post bulunamadı');
    await this.db.insert(postLikes).values({ postId, userId });
    await notificationsService.create({
      recipientId: post[0].authorId,
      actorId: userId,
      type: 'like',
      entityType: 'post',
      entityId: postId,
      payload: { postId },
    });
    events.emit('feed:interaction', { postId, type: 'like' });
    return { liked: true };
  }

  async toggleBookmark(postId: string, userId: string): Promise<{ bookmarked: boolean }> {
    const exists = await this.db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.postId, postId), eq(bookmarks.userId, userId)))
      .limit(1);

    if (exists[0]) {
      await this.db.delete(bookmarks).where(eq(bookmarks.id, exists[0].id));
      return { bookmarked: false };
    }

    await this.db.insert(bookmarks).values({ postId, userId });
    return { bookmarked: true };
  }

  async voteOnPoll(postId: string, userId: string, optionId: string): Promise<PollWithState> {
    const poll = await this.db
      .select()
      .from(postPolls)
      .where(eq(postPolls.postId, postId))
      .limit(1);

    const found = poll[0];
    if (!found) throw errors.notFound('Anket bulunamadı');
    if (found.closesAt && found.closesAt < new Date()) throw errors.badRequest('Anket kapalı');

    const option = found.options.find((o) => o.id === optionId);
    if (!option) throw errors.badRequest('Geçersiz seçenek');

    const alreadyVoted = await this.db
      .select({ id: pollVotes.id })
      .from(pollVotes)
      .where(and(eq(pollVotes.pollId, found.id), eq(pollVotes.voterId, userId)))
      .limit(1);

    if (alreadyVoted[0]) {
      await this.db.delete(pollVotes).where(eq(pollVotes.id, alreadyVoted[0].id));
      await this.db.update(postPolls).set({ totalVotes: found.totalVotes - 1 }).where(eq(postPolls.id, found.id));
    }

    await this.db.insert(pollVotes).values({ pollId: found.id, optionId, voterId: userId });
    await this.db.update(postPolls).set({ totalVotes: found.totalVotes + 1 }).where(eq(postPolls.id, found.id));

    return this.loadPoll(found.id, userId, found.options);
  }

  private async loadPoll(
    pollId: string,
    viewerId: string | undefined,
    options: { id: string; text: string }[],
  ): Promise<PollWithState> {
    const votes = await this.db.select({ optionId: pollVotes.optionId }).from(pollVotes).where(eq(pollVotes.pollId, pollId));
    const myVoteId = viewerId
      ? (
          await this.db
            .select({ optionId: pollVotes.optionId })
            .from(pollVotes)
            .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.voterId, viewerId)))
            .limit(1)
        )[0]?.optionId ?? null
      : null;

    const totalVotes = votes.length;
    const optionCounts = new Map<string, number>();
    for (const v of votes) optionCounts.set(v.optionId, (optionCounts.get(v.optionId) ?? 0) + 1);

    return {
      id: pollId,
      question: '',
      totalVotes,
      myVote: myVoteId,
      closed: false,
      options: options.map((o) => ({
        id: o.id,
        text: o.text,
        votes: optionCounts.get(o.id) ?? 0,
        percentage: totalVotes > 0 ? Math.round(((optionCounts.get(o.id) ?? 0) / totalVotes) * 100) : 0,
      })),
    };
  }

  private async getOwned(postId: string, userId: string) {
    const post = await this.db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    const found = post[0];
    if (!found) throw errors.notFound('Post bulunamadı');
    if (found.authorId !== userId) throw errors.forbidden();
    return found;
  }

  private decodeCursor(cursor: string) {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { createdAt: string; id: string };
    } catch {
      return null;
    }
  }

  private async toPostWithMeta(row: PostWithMetaRow, postId: string, viewerId?: string): Promise<PostWithMeta> {
    const [images, poll] = await Promise.all([
      this.db.select().from(postImages).where(eq(postImages.postId, postId)).orderBy(postImages.position),
      this.loadPollForPost(postId, viewerId),
    ]);

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      category: row.category,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      author: {
        id: row.author_id,
        username: row.username,
        name: row.name,
        avatarUrl: row.avatar_url,
        githubUsername: row.github_username,
      },
      likeCount: Number(row.like_count ?? 0),
      commentCount: Number(row.comment_count ?? 0),
      bookmarkCount: Number(row.bookmark_count ?? 0),
      likedByMe: Boolean(row.liked_by_me),
      bookmarkedByMe: Boolean(row.bookmarked_by_me),
      followedByMe: Boolean(row.followed_by_me),
      images: images.map((i) => ({ url: i.url, alt: i.alt, width: i.width, height: i.height })),
      poll,
    };
  }

  private async loadPollForPost(postId: string, viewerId?: string): Promise<PollWithState | null> {
    const poll = await this.db.select().from(postPolls).where(eq(postPolls.postId, postId)).limit(1);
    const found = poll[0];
    if (!found) return null;
    return {
      ...(await this.loadPoll(found.id, viewerId, found.options)),
      question: found.question,
      closed: Boolean(found.closesAt && found.closesAt < new Date()),
    };
  }
}

type PostWithMetaRow = Record<string, unknown> & {
  id: string;
  title: string | null;
  content: string;
  category: PostWithMeta['category'];
  source: PostWithMeta['source'];
  created_at: Date;
  updated_at: Date;
  author_id: string;
  username: string;
  name: string;
  avatar_url: string | null;
  github_username: string | null;
  like_count: number | null;
  comment_count: number | null;
  bookmark_count: number | null;
  liked_by_me: boolean | null;
  bookmarked_by_me: boolean | null;
  followed_by_me: boolean | null;
};

export const postsService = new PostsService(db);