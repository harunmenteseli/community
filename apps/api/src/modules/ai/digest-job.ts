import { eq, desc } from 'drizzle-orm';
import { db } from '../../db';
import { aiArticles, posts, users } from '../../db/schema';
import { fetchHackerNewsTop, fetchRedditTop, generateArticle, type SourceItem } from './digest-service';
import { errors } from '../../lib/errors';
import { logger } from '../../logger';

const BOT_USERNAME = 'community';

export async function ensureBotUser(): Promise<string> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, BOT_USERNAME)).limit(1);
  if (existing[0]) return existing[0].id;

  const created = await db
    .insert(users)
    .values({
      email: 'bot@community.local',
      username: BOT_USERNAME,
      name: 'Community AI',
      bio: 'Haftalık geliştirici özetleri — yapay zeka ile hazırlanır.',
      role: 'bot',
      emailVerifiedAt: new Date(),
    })
    .returning({ id: users.id });
  return created[0]!.id;
}

export async function runDigest(manualSources?: SourceItem[]): Promise<{ articleId: string; postId: string }> {
  const sources = manualSources ?? [...(await fetchHackerNewsTop()), ...(await fetchRedditTop())];
  if (sources.length === 0) throw errors.internal('Hiçbir kaynak çekilemedi');

  const article = await generateArticle(sources);
  const botId = await ensureBotUser();

  const now = new Date();
  const day = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((day + 6) % 7));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const slug = `diger-${weekStart.toISOString().slice(0, 10)}`;

  const inserted = await db
    .insert(aiArticles)
    .values({
      slug,
      title: article.title,
      summary: article.summary,
      content: article.content,
      weekStart,
      weekEnd,
      sources: JSON.stringify(sources.slice(0, 30)),
    })
    .onConflictDoNothing()
    .returning({ id: aiArticles.id });

  const articleId = inserted[0]?.id ?? (await db.select({ id: aiArticles.id }).from(aiArticles).where(eq(aiArticles.slug, slug)).limit(1))[0]?.id;

  if (!articleId) throw errors.internal('Makale oluşturulamadı');

  // Feed'de AI post'u olarak yayınla
  const post = await db
    .insert(posts)
    .values({
      authorId: botId,
      title: article.title,
      content: article.content,
      category: 'genel',
      source: 'ai',
    })
    .returning({ id: posts.id });

  logger.info({ articleId, postId: post[0]!.id }, 'Haftalık AI özeti yayınlandı');
  return { articleId, postId: post[0]!.id };
}

export async function listDigests() {
  return db.select().from(aiArticles).orderBy(desc(aiArticles.weekStart)).limit(20);
}

export async function getDigestBySlug(slug: string) {
  const row = await db.select().from(aiArticles).where(eq(aiArticles.slug, slug)).limit(1);
  const found = row[0];
  if (!found) throw errors.notFound('Özet makalesi bulunamadı');
  return { ...found, sources: safeParseSources(found.sources) };
}

function safeParseSources(raw: string): SourceItem[] {
  try {
    return JSON.parse(raw) as SourceItem[];
  } catch {
    return [];
  }
}