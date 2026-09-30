import type { Post } from './api';

export type ReactionKind = 'like' | 'bookmark';

export type ReactionState = Pick<Post, 'likedByMe' | 'likeCount' | 'bookmarkedByMe' | 'bookmarkCount'>;

/**
 * Bir postun begenme/kaydetme durumunu tersine cevirir. Optimistik UI burada
 * hesaplanir; hata halinde eski deger geri konur (bkz. usePostReaction).
 */
export function toggleReaction<T extends ReactionState>(post: T, kind: ReactionKind): T {
  if (kind === 'like') {
    return {
      ...post,
      likedByMe: !post.likedByMe,
      likeCount: Math.max(0, post.likeCount + (post.likedByMe ? -1 : 1)),
    };
  }

  return {
    ...post,
    bookmarkedByMe: !post.bookmarkedByMe,
    bookmarkCount: Math.max(0, post.bookmarkCount + (post.bookmarkedByMe ? -1 : 1)),
  };
}

/** Sunucunun dondurdugu mutlak durumu uygular (toggle degil, atama). */
export function setReaction<T extends ReactionState>(
  post: T,
  kind: ReactionKind,
  value: boolean,
): T {
  if (kind === 'like') {
    return post.likedByMe === value ? post : { ...post, likedByMe: value };
  }
  return post.bookmarkedByMe === value ? post : { ...post, bookmarkedByMe: value };
}

/**
 * Feed'in infinity cache'inde ayni postun tum kopyalarini gunceller; ayni post
 * birden fazla sayfada geciyorsa hepsi esitlenir.
 */
export function patchFeedCache<T extends ReactionState & { id: string }>(
  data: { pages: { posts: T[] }[] } | undefined,
  postId: string,
  updater: (post: T) => T,
): { pages: { posts: T[] }[] } | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => (post.id === postId ? updater(post) : post)),
    })),
  };
}

/** Post detay cache'ini ({ post }) sekline gore gunceller. */
export function patchPostCache<T extends ReactionState & { id: string }>(
  data: { post: T } | undefined,
  postId: string,
  updater: (post: T) => T,
): { post: T } | undefined {
  if (!data?.post || data.post.id !== postId) return data;
  return { post: updater(data.post) };
}
