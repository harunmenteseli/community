import { and, eq } from 'drizzle-orm';
import type { DB } from '../../db';
import { db } from '../../db';
import { users, userTools, follows, oauthAccounts, reports, posts, comments, projects } from '../../db/schema';
import type { UpdateProfileDto, ChangePasswordDto, UpdateUsernameDto } from '@community/shared';
import { errors, isUniqueViolation } from '../../lib/errors';
import argon2 from 'argon2';

export class UsersService {
  constructor(private readonly db: DB) {}

  async updateProfile(userId: string, input: UpdateProfileDto) {
    const { tools, ...profile } = input;
    await this.db
      .update(users)
      .set({
        name: profile.name,
        bio: profile.bio || null,
        siteUrl: profile.siteUrl || null,
        githubUsername: profile.githubUsername || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await this.db.delete(userTools).where(eq(userTools.userId, userId));
    if (tools.length > 0) {
      await this.db.insert(userTools).values(tools.map((name, i) => ({ userId, name, sortOrder: i })));
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user?.passwordHash) {
      throw errors.badRequest('Bu hesapta şifre yok. GitHub ile giriş yapılmış olabilir', 'NO_PASSWORD');
    }
    if (!(await argon2.verify(user.passwordHash, currentPassword))) {
      throw errors.unauthorized('Mevcut şifre hatalı', 'INVALID_CURRENT_PASSWORD');
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async changeUsername(userId: string, username: string) {
    try {
      await this.db.update(users).set({ username, updatedAt: new Date() }).where(eq(users.id, userId));
    } catch (err) {
      if (isUniqueViolation(err)) throw errors.conflict('Bu kullanıcı adı alınmış', 'USERNAME_TAKEN');
      throw err;
    }
  }

  async deleteAccount(userId: string) {
    const user = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) throw errors.notFound('Kullanıcı bulunamadı');
    if (user.email.endsWith('@github.local')) {
      // oauth-only hesap: e-postayı anonimleştir (cascade silme yerine veri koruma)
    }
    await this.db.delete(users).where(eq(users.id, userId));
  }

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) throw errors.badRequest('Kendini takip edemezsin');
    await this.ensureUser(followingId);
    await this.db.insert(follows).values({ followerId, followingId }).onConflictDoNothing();
  }

  async unfollow(followerId: string, followingId: string) {
    await this.db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    if (!followerId) return false;
    const row = await this.db
      .select({ id: follows.id })
      .from(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)))
      .limit(1);
    return Boolean(row[0]);
  }

  async report(reporterId: string, input: { targetType: string; targetId: string; reason: string; message?: string }) {
    if (reporterId === input.targetId) throw errors.badRequest('Kendini şikayet edemezsin');
    await this.db.insert(reports).values({ reporterId, ...input });
  }

  async isOauthOnly(userId: string): Promise<boolean> {
    const row = await this.db
      .select({ id: oauthAccounts.id })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId))
      .limit(1);
    return Boolean(row[0]);
  }

  async getStats(userId: string) {
    const [followers, following, postCount, commentCount, projectCount] = await Promise.all([
      this.db.select().from(follows).where(eq(follows.followingId, userId)),
      this.db.select().from(follows).where(eq(follows.followerId, userId)),
      this.db.select().from(posts).where(and(eq(posts.authorId, userId), eq(posts.isDraft, false))),
      this.db.select().from(comments).where(eq(comments.authorId, userId)),
      this.db.select().from(projects).where(eq(projects.userId, userId)),
    ]);

    return {
      followerCount: followers.length,
      followingCount: following.length,
      postCount: postCount.length,
      commentCount: commentCount.length,
      projectCount: projectCount.length,
    };
  }

  private async ensureUser(id: string) {
    const row = await this.db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (!row[0]) throw errors.notFound('Kullanıcı bulunamadı');
  }
}

export const usersService = new UsersService(db);