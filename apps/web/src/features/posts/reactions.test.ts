import { describe, expect, it } from 'vitest';
import { patchFeedCache, patchPostCache, setReaction, toggleReaction } from './reactions';

const post = {
  id: 'p1',
  likedByMe: false,
  likeCount: 0,
  bookmarkedByMe: false,
  bookmarkCount: 0,
};

describe('toggleReaction', () => {
  it('begenmeyi acar ve sayaci artirir', () => {
    expect(toggleReaction(post, 'like')).toMatchObject({ likedByMe: true, likeCount: 1 });
  });

  it('begenmeyi kaldirir ve sayaci azaltir', () => {
    const liked = { ...post, likedByMe: true, likeCount: 1 };
    expect(toggleReaction(liked, 'like')).toMatchObject({ likedByMe: false, likeCount: 0 });
  });

  it('sayac eksiye dusmez', () => {
    const odd = { ...post, likedByMe: false, likeCount: 0 };
    expect(toggleReaction(odd, 'like').likeCount).toBe(1);
    expect(toggleReaction({ ...post, bookmarkedByMe: false, bookmarkCount: 0 }, 'bookmark').bookmarkCount).toBe(1);
  });

  it('kaydetmeyi degistirir, begenmeyi etkilemez', () => {
    const result = toggleReaction({ ...post, likedByMe: true, likeCount: 3 }, 'bookmark');
    expect(result).toMatchObject({ bookmarkedByMe: true, bookmarkCount: 1, likedByMe: true, likeCount: 3 });
  });
});

describe('setReaction', () => {
  it('sunucu degerini mutlak olarak uygular', () => {
    const liked = { ...post, likedByMe: true, likeCount: 1 };
    expect(setReaction(liked, 'like', false)).toMatchObject({ likedByMe: false });
  });

  it('degisiklik yoksa ayni referansi doner', () => {
    expect(setReaction(post, 'like', false)).toBe(post);
  });

  it('sayaclara dokunmaz', () => {
    expect(setReaction({ ...post, likeCount: 7 }, 'like', true).likeCount).toBe(7);
  });
});

describe('patchFeedCache', () => {
  const cache = {
    pages: [
      { posts: [post, { ...post, id: 'p2' }] },
      { posts: [{ ...post, id: 'p1' }] },
    ],
  };

  it('tum sayfalardaki ayni postu gunceller', () => {
    const next = patchFeedCache(cache, 'p1', (p) => toggleReaction(p, 'like'));
    expect(next?.pages.map((page) => page.posts[0]?.likedByMe)).toEqual([true, true]);
  });

  it('diger postlara dokunmaz', () => {
    const next = patchFeedCache(cache, 'p1', (p) => toggleReaction(p, 'like'));
    expect(next?.pages[0]?.posts[1]).toEqual({ ...post, id: 'p2' });
  });

  it('undefined veriyi oldugu gibi birakir', () => {
    expect(patchFeedCache(undefined, 'p1', (p) => p)).toBeUndefined();
  });

  it('olmayan post icin degisiklik yapmaz', () => {
    expect(patchFeedCache(cache, 'yok', (p) => toggleReaction(p, 'like'))).toEqual(cache);
  });
});

describe('patchPostCache', () => {
  it('postu gunceller', () => {
    const next = patchPostCache({ post }, 'p1', (p) => toggleReaction(p, 'bookmark'));
    expect(next?.post.bookmarkedByMe).toBe(true);
  });

  it('baska postu degistirmez', () => {
    expect(patchPostCache({ post }, 'p2', (p) => toggleReaction(p, 'bookmark'))).toEqual({ post });
  });

  it('undefined veriyi birakir', () => {
    expect(patchPostCache(undefined, 'p1', (p) => p)).toBeUndefined();
  });
});
