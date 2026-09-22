import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../env';
import { logger } from '../../logger';
import { errors } from '../../lib/errors';

export interface SourceItem {
  title: string;
  url: string;
  source: string;
  points?: number;
  comments?: number;
  summary?: string;
}

export async function fetchHackerNewsTop(count = 25): Promise<SourceItem[]> {
  try {
    const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=100');
    const data = (await res.json()) as {
      hits: { title: string; url: string; points: number; num_comments: number }[];
    };
    return data.hits
      .slice(0, count)
      .map((h) => ({
        title: h.title,
        url: h.url || `https://news.ycombinator.com/item?id=`,
        source: 'hackernews',
        points: h.points,
        comments: h.num_comments,
      }))
      .filter((h) => h.title);
  } catch (err) {
    logger.error({ err }, 'HN çekilemedi');
    return [];
  }
}

const REDDIT_SUBREDDITS = ['programming', 'technology', 'webdev', 'MachineLearning', 'devops'];

export async function fetchRedditTop(countPer = 10): Promise<SourceItem[]> {
  const results: SourceItem[] = [];
  await Promise.all(
    REDDIT_SUBREDDITS.map(async (sub) => {
      try {
        const res = await fetch(`https://www.reddit.com/r/${sub}/hot.json?limit=${countPer}&t=week`, {
          headers: { 'User-Agent': 'community-digest/1.0' },
        });
        const data = (await res.json()) as {
          data?: { children?: { data: { title: string; url: string; score: number; num_comments: number; selftext: string } }[] };
        };
        for (const child of data.data?.children ?? []) {
          const d = child.data;
          if (!d.title) continue;
          results.push({
            title: d.title,
            url: d.url.startsWith('/r/') ? `https://www.reddit.com${d.url}` : d.url,
            source: `reddit/${sub}`,
            points: d.score,
            comments: d.num_comments,
            summary: d.selftext.slice(0, 240) || undefined,
          });
        }
      } catch (err) {
        logger.error({ err, sub }, 'Reddit çekilemedi');
      }
    }),
  );
  return results;
}

export async function generateArticle(sources: SourceItem[]): Promise<{ title: string; content: string; summary: string }> {
  if (!env.ANTHROPIC_API_KEY) throw errors.internal('ANTHROPIC_API_KEY yok — AI özeti üretilemez');

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const sourceText = sources
    .map((s, i) => `${i + 1}. [${s.source}] ${s.title} — ${s.url}${s.points ? ` (${s.points} puan, ${s.comments} yorum)` : ''}${s.summary ? `\n   Özet: ${s.summary}` : ''}`)
    .join('\n');

  const system =
    'Sen "Community" geliştirici topluluğunun haftalık teknoloji özet editörüsün. ' +
    'Türkçe yazarsın, teknik ama sade bir dil kullanırsın. Aşağıdaki kaynaklardan o haftanın ' +
    'geliştirici dünyasındaki en önemli konularını çıkarır, temalara göre gruplarsın: ' +
    'yeni çıkanlar, güvenlik, yazılım dilleri, AI yenilikleri, araç/framework gelişmeleri. ' +
    'Başlık ve özet dahil çıktını yalnızca JSON olarak üretirsin: {"title": "...", "summary": "...", "content_markdown": "..."}. ' +
    'content_markdown markdown ile yazılır; başlıklar (##), listeler, güçlü vurgular ve kod blokları kullanabilirsin.';

  const messages = [
    {
      role: 'user' as const,
      content: `İşte bu haftanın kaynakları:\n\n${sourceText}\n\nBunlardan haftalık geliştirici özeti çıkar.`,
    },
  ];

  try {
    const res = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 6000,
      temperature: 0.6,
      system,
      messages,
    });

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const parsed = safeParseJson(text);
    if (!parsed?.title || !parsed.content_markdown) {
      throw new Error('Claude çıktısı ayrıştırılamadı');
    }
    return {
      title: parsed.title,
      summary: parsed.summary ?? '',
      content: parsed.content_markdown,
    };
  } catch (err) {
    logger.error({ err }, 'Claude isteği başarısız');
    throw errors.internal('AI içerik üretimi başarısız');
  }
}

function safeParseJson(text: string): { title: string; summary: string; content_markdown: string } | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}