import { and, eq, isNull, not, sql } from 'drizzle-orm';
import argon2 from 'argon2';
import type { DB } from '../../db';
import { db } from '../../db';
import {
  users,
  sessions,
  emailVerifications,
  passwordResets,
  oauthAccounts,
  notificationSettings,
} from '../../db/schema';
import type { RegisterDto, LoginDto } from '@community/shared';
import { randomUUID } from 'node:crypto';
import { generateToken, hashToken, calculateTokenExpiry, signSessionHash } from '../../lib/crypto';
import { errors, isUniqueViolation } from '../../lib/errors';
import { sendMail, layout } from '../../lib/mail';
import { env } from '../../env';

export class AuthService {
  constructor(private readonly db: DB) {}

  async register(input: RegisterDto, ip?: string, userAgent?: string) {
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    let userId: string;
    try {
      const inserted = await this.db
        .insert(users)
        .values({
          email: input.email,
          username: input.username,
          name: input.name,
          passwordHash,
          emailVerifiedAt: null,
        })
        .returning({ id: users.id });

      userId = inserted[0]!.id;
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw errors.conflict('Bu e-posta veya kullanıcı adı zaten kayıtlı', 'EMAIL_OR_USERNAME_EXISTS');
      }
      throw err;
    }

    await this.db.insert(notificationSettings).values({ userId }).onConflictDoNothing();

    const verificationToken = generateToken();
    await this.db.insert(emailVerifications).values({
      userId,
      tokenHash: hashToken(verificationToken),
      expiresAt: calculateTokenExpiry(1),
    });

    const verifyUrl = `${env.APP_URL}/auth/verify-email?token=${verificationToken}`;
    await sendMail({
      to: input.email,
      subject: 'E-postanı doğrula — Community',
      html: layout(
        'Hoş geldin! 👋',
        `<p><strong>${input.name}</strong> adıyla ${input.username} kullanıcı adınla kaydını oluşturduk.</p><p>Hesabını aktifleştirmek için aşağıdaki butona tıkla:</p><p style="margin:24px 0;"><a href="${verifyUrl}" style="background:#111;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;">E-postamı Doğrula</a></p><p style="font-size:13px;color:#6b7280;">Bu link 24 saat geçerlidir.</p>`,
      ),
    });

    return this.createSession(userId, ip, userAgent);
  }

  async login(input: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.db.select().from(users).where(eq(users.email, input.email)).limit(1);
    const found = user[0];

    if (!found || !found.passwordHash || !(await argon2.verify(found.passwordHash, input.password))) {
      throw errors.unauthorized('E-posta veya şifre hatalı', 'INVALID_CREDENTIALS');
    }

    if (!found.isActive) {
      throw errors.forbidden('Hesabınız askıya alınmış', 'ACCOUNT_DISABLED');
    }

    return this.createSession(found.id, ip, userAgent);
  }

  private async createSession(userId: string, ip?: string, userAgent?: string) {
    const sessionId = randomUUID();
    const tokenHash = hashToken(sessionId);
    const expiresAt = calculateTokenExpiry(env.SESSION_TTL_DAYS);

    await this.db.insert(sessions).values({ id: sessionId, userId, tokenHash, ip, userAgent, expiresAt });

    const signature = signSessionHash(userId, tokenHash);

    return { session: { id: sessionId, expiresAt }, token: `${sessionId}.${userId}.${signature}` };
  }

  async issueSession(userId: string, ip?: string, userAgent?: string) {
    return this.createSession(userId, ip, userAgent);
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);
    const row = await this.db
      .select()
      .from(emailVerifications)
      .where(eq(emailVerifications.tokenHash, tokenHash))
      .limit(1);

    const record = row[0];
    if (!record || record.usedAt) throw errors.badRequest('Geçersiz veya kullanılmış doğrulama kodu', 'INVALID_TOKEN');
    if (record.expiresAt < new Date()) throw errors.badRequest('Doğrulama linkinin süresi dolmuş', 'TOKEN_EXPIRED');

    const now = new Date();
    await this.db.transaction(async (tx) => {
      await tx
        .update(emailVerifications)
        .set({ usedAt: now })
        .where(eq(emailVerifications.id, record.id));
      await tx.update(users).set({ emailVerifiedAt: now }).where(eq(users.id, record.userId));
    });
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    const found = user[0];
    if (!found) return;
    if (found.emailVerifiedAt) return;

    const verificationToken = generateToken();
    await this.db
      .update(emailVerifications)
      .set({ usedAt: new Date() })
      .where(and(eq(emailVerifications.userId, found.id), isNull(emailVerifications.usedAt)));

    await this.db.insert(emailVerifications).values({
      userId: found.id,
      tokenHash: hashToken(verificationToken),
      expiresAt: calculateTokenExpiry(1),
    });

    const verifyUrl = `${env.APP_URL}/auth/verify-email?token=${verificationToken}`;
    await sendMail({
      to: email,
      subject: 'E-postanı doğrula — Community',
      html: layout('Yeni doğrulama linki', `<p><a href="${verifyUrl}">Buraya tıklayarak</a> e-postanı doğrulayabilirsin. Bu link 24 saat geçerlidir.</p>`),
    });
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    const found = user[0];
    if (!found) return; // enumerasyonu önlemek için aynı yanıt

    const token = generateToken();
    await this.db.insert(passwordResets).values({
      userId: found.id,
      tokenHash: hashToken(token),
      expiresAt: calculateTokenExpiry(1),
    });

    const resetUrl = `${env.APP_URL}/auth/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: 'Şifre sıfırlama — Community',
      html: layout(
        'Şifreni sıfırla',
        `<p>Şifreni sıfırlamak için <a href="${resetUrl}">bu linke</a> tıklayın. Bu link 1 saat geçerlidir.</p><p>Bu isteği sen yapmadıysan bu e-postayı yoksayabilirsin.</p>`,
      ),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const row = await this.db
      .select()
      .from(passwordResets)
      .where(eq(passwordResets.tokenHash, tokenHash))
      .limit(1);

    const record = row[0];
    if (!record || record.usedAt) throw errors.badRequest('Geçersiz veya kullanılmış kod', 'INVALID_TOKEN');
    if (record.expiresAt < new Date()) throw errors.badRequest('Kodun süresi dolmuş', 'TOKEN_EXPIRED');

    const passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });

    await this.db.transaction(async (tx) => {
      await tx.update(passwordResets).set({ usedAt: new Date() }).where(eq(passwordResets.id, record.id));
      await tx.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
      await tx.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.userId, record.userId));
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  }

  async revokeAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    const base = and(eq(sessions.userId, userId));
    const where = exceptSessionId ? and(base, not(eq(sessions.id, exceptSessionId))) : base;
    await this.db.update(sessions).set({ revokedAt: new Date() }).where(where);
  }

  async listSessions(userId: string) {
    const rows = await this.db
      .select({
        id: sessions.id,
        ip: sessions.ip,
        userAgent: sessions.userAgent,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .orderBy(sql`created_at desc`);

    return rows.filter((r) => new Date(r.expiresAt) > new Date());
  }
}

export const authService = new AuthService(db);