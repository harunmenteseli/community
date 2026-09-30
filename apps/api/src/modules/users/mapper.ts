import type { SQL } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { users, follows } from '../../db/schema';
import { errors } from '../../lib/errors';

export async function toUserPublic(username: string) {
  const row = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      siteUrl: users.siteUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  const user = row[0];
  if (!user) throw errors.notFound('Kullanıcı bulunamadı');

  return { ...user, siteUrl: user.siteUrl && user.siteUrl.length > 0 ? user.siteUrl : null };
}

export async function toUserPublicById(id: string) {
  return toUserPublicByWhere(eq(users.id, id));
}

export async function toUserPublicByEmail(email: string) {
  return toUserPublicByWhere(eq(users.email, email));
}

async function toUserPublicByWhere(where: SQL) {
  const row = await db
    .select({
      id: users.id,
      username: users.username,
      name: users.name,
      bio: users.bio,
      avatarUrl: users.avatarUrl,
      siteUrl: users.siteUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(where)
    .limit(1);

  const user = row[0];
  if (!user) throw errors.notFound('Kullanıcı bulunamadı');

  const followers = await db
    .select({ id: follows.id })
    .from(follows)
    .where(eq(follows.followingId, user.id));
  const following = await db
    .select({ id: follows.id })
    .from(follows)
    .where(eq(follows.followerId, user.id));

  return {
    ...user,
    siteUrl: user.siteUrl && user.siteUrl.length > 0 ? user.siteUrl : null,
    followerCount: followers.length,
    followingCount: following.length,
  };
}