import type { FastifyInstance } from 'fastify';
import {
  updateProfileSchema,
  changePasswordSchema,
  updateUsernameSchema,
} from '@community/shared';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '../../db';
import { users, userTools, follows, posts, projects } from '../../db/schema';
import { errors } from '../../lib/errors';
import { usersService } from './service';
import { toUserPublicById } from './mapper';
import { notificationsService } from '../notifications/service';
import { authService } from '../auth/service';

export async function registerUsers(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { username: string } }>('/api/users/:username', async (request) => {
    const { username } = request.params;
    const viewerId = request.authUser?.id;

    const row = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        bio: users.bio,
        avatarUrl: users.avatarUrl,
        siteUrl: users.siteUrl,
        githubUsername: users.githubUsername,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    const user = row[0];
    if (!user) throw errors.notFound('Kullanıcı bulunamadı');

    const [tools, followers, following, userPostCount, userProjectCount] = await Promise.all([
      db.select({ name: userTools.name }).from(userTools).where(eq(userTools.userId, user.id)),
      db.select({ id: follows.id }).from(follows).where(eq(follows.followingId, user.id)),
      db.select({ id: follows.id }).from(follows).where(eq(follows.followerId, user.id)),
      db.select({ id: posts.id }).from(posts).where(and(eq(posts.authorId, user.id), eq(posts.isDraft, false))),
      db.select({ id: projects.id }).from(projects).where(eq(projects.userId, user.id)),
    ]);

    return {
      user: {
        ...user,
        siteUrl: user.siteUrl || null,
        tools: tools.map((t) => t.name),
      },
      stats: {
        followerCount: followers.length,
        followingCount: following.length,
        postCount: userPostCount.length,
        projectCount: userProjectCount.length,
      },
      isFollowing: viewerId ? await usersService.isFollowing(viewerId, user.id) : false,
      isSelf: viewerId === user.id,
    };
  });

  app.patch('/api/users/me', async (request) => {
    const { id } = request.requireAuthUser();
    const body = updateProfileSchema.parse(request.body);
    await usersService.updateProfile(id, body);
    return { user: await toUserPublicById(id) };
  });

  app.post('/api/users/me/change-password', async (request) => {
    const { id, sessionId } = request.requireAuthUser();
    const body = changePasswordSchema.parse(request.body);
    await usersService.changePassword(id, body.currentPassword, body.newPassword);
    if (sessionId) await authService.revokeAllSessions(id, sessionId);
    return { success: true };
  });

  app.patch('/api/users/me/username', async (request) => {
    const { id } = request.requireAuthUser();
    const body = updateUsernameSchema.parse(request.body);
    await usersService.changeUsername(id, body.username);
    return { user: await toUserPublicById(id) };
  });

  app.delete('/api/users/me', async (request) => {
    const { id } = request.requireAuthUser();
    await usersService.deleteAccount(id);
    return { success: true };
  });

  app.post<{ Params: { username: string } }>('/api/users/:username/follow', async (request) => {
    const { id } = request.requireAuthUser();
    const target = await getUserByUsername(request.params.username);
    await usersService.follow(id, target.id);
    await notificationsService.create({
      recipientId: target.id,
      actorId: id,
      type: 'follow',
      entityType: 'user',
      entityId: target.id,
      payload: { username: request.params.username },
    });
    return { success: true };
  });

  app.post<{ Params: { username: string } }>('/api/users/:username/unfollow', async (request) => {
    const { id } = request.requireAuthUser();
    const target = await getUserByUsername(request.params.username);
    await usersService.unfollow(id, target.id);
    return { success: true };
  });

  app.post<{ Params: { username: string } }>('/api/users/:username/report', async (request) => {
    const { id } = request.requireAuthUser();
    const target = await getUserByUsername(request.params.username);
    const { reason, message } = request.body as { reason: string; message?: string };
    if (!reason || reason.length > 200) throw errors.badRequest('Gerekçe gerekli (≤200 karakter)');
    await usersService.report(id, { targetType: 'user', targetId: target.id, reason, message });
    return { success: true };
  });

  app.get<{ Params: { username: string } }>('/api/users/:username/projects', async (request) => {
    const { username } = request.params;
    const user = await getUserByUsername(username);
    const rows = await db
      .select({
        id: projects.id,
        name: projects.name,
        url: projects.url,
        category: projects.category,
        buildWith: projects.buildWith,
        isOpenSource: projects.isOpenSource,
        githubUrl: projects.githubUrl,
        description: projects.description,
        logoUrl: projects.logoUrl,
        launched: projects.launched,
        avgRating: projects.avgRating,
        ratingCount: projects.ratingCount,
        createdAt: projects.createdAt,
      })
      .from(projects)
      .where(and(eq(projects.userId, user.id), eq(projects.launched, true)))
      .orderBy(desc(projects.createdAt));
    return { projects: rows };
  });
}

async function getUserByUsername(username: string) {
  const row = await db
    .select({ id: users.id, username: users.username })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  if (!row[0]) throw errors.notFound('Kullanıcı bulunamadı');
  return row[0];
}

