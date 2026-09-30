import { and, eq, sql } from 'drizzle-orm';
import type { DB } from '../../db';
import { db } from '../../db';
import { users, follows, posts, comments } from '../../db/schema';
import type { AccountInfo, UpdateProfileDto } from '@community/shared';
import { isReservedUsername } from '@community/shared';
import { errors, isUniqueViolation } from '../../lib/errors';
import { deleteStoredFile } from '../uploads/storage';
import argon2 from 'argon2';

export class UsersService {
  constructor(private readonly db: DB) {}

  async updateProfile(userId: string, input: UpdateProfileDto) {
    await this.db
      .update(users)
      .set({
        name: input.name,
        bio: input.bio || null,
        siteUrl: input.siteUrl || null,
        // Avatar opsiyonel: gonderilmediginde mevcut resim korunur.
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl || null } : {}),
        ...(input.tools !== undefined ? { tools: normalizeTools(input.tools) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user?.passwordHash) {
      throw errors.badRequest('Bu hesapta şifre kayıtlı değil', 'NO_PASSWORD');
    }
    if (!(await argon2.verify(user.passwordHash, currentPassword))) {
      throw errors.unauthorized('Mevcut şifre hatalı', 'INVALID_CURRENT_PASSWORD');
    }
    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));
  }

  async changeUsername(userId: string, username: string) {
    // Rezerve adlar rota/adres cakistirir; kullanici adlari buyuk/kucuk harf
    // duyarsiz kabul edildigi icin ayni kontrol sunucuda yapiliyor.
    if (isReservedUsername(username)) {
      throw errors.conflict('Bu kullanıcı adı kullanılamaz', 'USERNAME_RESERVED');
    }

    const current = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!current) throw errors.notFound('Kullanıcı bulunamadı');
    if (current.username.toLowerCase() === username.toLowerCase()) {
      throw errors.conflict('Yeni kullanıcı adı eskisiyle aynı', 'USERNAME_UNCHANGED');
    }

    // DB'deki unique constraint buyuk/kucuk harf duyarli: `Ali` ile `ali`
    // ayri kayit olabilirdi. Ayri bir buyuk/kucuk harf duyarsiz kontrol ile
    // kapatiliyor, DB constraint'i son savunma hatti olarak kalir.
    const taken = await this.db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`)
      .limit(1);
    if (taken[0]) throw errors.conflict('Bu kullanıcı adı alınmış', 'USERNAME_TAKEN');

    try {
      await this.db.update(users).set({ username, updatedAt: new Date() }).where(eq(users.id, userId));
    } catch (err) {
      if (isUniqueViolation(err)) throw errors.conflict('Bu kullanıcı adı alınmış', 'USERNAME_TAKEN');
      throw err;
    }
  }

  /** Sadece sahibine donen hesap bilgileri (eposta, rol, kayit tarihi). */
  async getAccountInfo(userId: string): Promise<AccountInfo> {
    const row = (
      await this.db
        .select({
          username: users.username,
          name: users.name,
          email: users.email,
          emailVerifiedAt: users.emailVerifiedAt,
          role: users.role,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    )[0];
    if (!row) throw errors.notFound('Kullanıcı bulunamadı');
    return {
      ...row,
      createdAt: row.createdAt.toISOString(),
      emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
    };
  }

  async deleteAccount(userId: string, password: string, confirmText: string) {
    const user = (await this.db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
    if (!user) throw errors.notFound('Kullanıcı bulunamadı');

    // Yanlis kullanici adinda sunucu hicbir sifre kontrolu yapmaz: iki hatanin
    // biri bile sifrenin dogru olup olmadigini ele vermemeli.
    if (confirmText.trim() !== user.username) {
      throw errors.badRequest('Kullanıcı adı eşleşmiyor', 'CONFIRM_MISMATCH');
    }
    if (!user.passwordHash) {
      throw errors.badRequest('Bu hesapta şifre kayıtlı değil', 'NO_PASSWORD');
    }
    if (!(await argon2.verify(user.passwordHash, password))) {
      throw errors.unauthorized('Mevcut şifre hatalı', 'INVALID_CURRENT_PASSWORD');
    }

    await this.db.delete(users).where(eq(users.id, userId));
    // Satirlar DB'den gitti; avatar dosyasi diskte kalmamali.
    if (user.avatarUrl) await deleteStoredFile(user.avatarUrl);
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

  async getStats(userId: string) {
    const [followers, following, postCount, commentCount] = await Promise.all([
      this.db.select().from(follows).where(eq(follows.followingId, userId)),
      this.db.select().from(follows).where(eq(follows.followerId, userId)),
      this.db.select().from(posts).where(and(eq(posts.authorId, userId), eq(posts.isDraft, false))),
      this.db.select().from(comments).where(eq(comments.authorId, userId)),
    ]);

    return {
      followerCount: followers.length,
      followingCount: following.length,
      postCount: postCount.length,
      commentCount: commentCount.length,
    };
  }

private async ensureUser(id: string) {
    const row = (await this.db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1));
    if (!row[0]) throw errors.notFound('Kullanıcı bulunamadı');
  }
}

/** Boslari kirp, buyuk/kucuk harf duyarsiz tekillestir, ilk 20 kaydi al. */
export function normalizeTools(tools: readonly string[]): string[] {
  const unique = new Map<string, string>();
  for (const tool of tools) {
    const trimmed = tool.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()].slice(0, 20);
}

export const usersService = new UsersService(db);