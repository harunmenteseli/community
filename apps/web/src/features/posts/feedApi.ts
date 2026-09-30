import { feedParamsSchema, POST_CATEGORIES, POST_GAMES, type PostCategory, type PostGame } from '@community/shared';
import { http } from '../../lib/api';
import type { Post } from './api';

export type FeedFilter = 'yeni' | 'trend' | 'takip';

export const FEED_FILTERS: { value: FeedFilter; label: string }[] = [
  { value: 'yeni', label: 'Yeni' },
  { value: 'trend', label: 'Trend' },
  { value: 'takip', label: 'Takip' },
];

export interface FeedResult {
  posts: Post[];
  nextCursor: string | null;
}

export interface FeedQuery {
  filter?: FeedFilter;
  cursor?: string | null;
  limit?: number;
  category?: PostCategory | null;
  game?: PostGame | null;
}

export const feedApi = {
  list: ({ filter = 'yeni', cursor, limit = 20, category, game }: FeedQuery = {}) => {
    // cursor ilk sayfada null gelir; sema yalnizca string kabul ettigi icin gonderilmez.
    const params = feedParamsSchema.parse({ filter, limit, ...(cursor ? { cursor } : {}) });

    const search = new URLSearchParams();
    search.set('filter', params.filter);
    search.set('limit', String(params.limit));
    if (cursor) search.set('cursor', cursor);
    if (category) search.set('category', category);
    if (game) search.set('game', game);

    return http.get<FeedResult>(`/api/feed?${search.toString()}`);
  },
};

/** Kategori/oyun filtreleri API'de destekleniyorsa buradan da ayni sekilde gonderilir. */
export const isCategory = (value: string): value is PostCategory =>
  (POST_CATEGORIES as readonly string[]).includes(value);

export const isGame = (value: string): value is PostGame => (POST_GAMES as readonly string[]).includes(value);
