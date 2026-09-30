import { describe, expect, it } from 'vitest';
import { patchFollowedInFeed, patchPostFollowed, setFollowed } from './follows';

const post = (id: string, authorId: string, followedByMe = false) => ({
  id,
  followedByMe,
  author: { id: authorId },
});

describe('setFollowed', () => {
  it('durumu atar', () => {
    expect(setFollowed(post('p1', 'a1'), true).followedByMe).toBe(true);
    expect(setFollowed(post('p1', 'a1', true), false).followedByMe).toBe(false);
  });

  it('degisiklik yoksa ayni referansi doner', () => {
    const current = post('p1', 'a1', true);
    expect(setFollowed(current, true)).toBe(current);
  });
});

describe('patchFollowedInFeed', () => {
  const data = {
    pages: [{ posts: [post('p1', 'a1'), post('p2', 'a2')] }, { posts: [post('p3', 'a1')] }],
  };

  it('yazarin tum kopyalarini gunceller', () => {
    const next = patchFollowedInFeed(data, 'a1', true);
    const firstPage = next?.pages[0]?.posts ?? [];
    const secondPage = next?.pages[1]?.posts ?? [];
    expect(firstPage[0]?.followedByMe).toBe(true);
    expect(secondPage[0]?.followedByMe).toBe(true);
    expect(firstPage[1]?.followedByMe).toBe(false);
  });

  it('cache yoksa hicbir sey yapmaz', () => {
    expect(patchFollowedInFeed(undefined, 'a1', true)).toBeUndefined();
  });

  it('sayfa sayisi degismez, yeni referans doner', () => {
    const next = patchFollowedInFeed(data, 'a2', true);
    expect(next?.pages).toHaveLength(2);
    expect(next).not.toBe(data);
  });
});

describe('patchPostFollowed', () => {
  it('post detayinda ayni id guncellenir', () => {
    const data = { post: post('p1', 'a1') };
    expect(patchPostFollowed(data, 'p1', true)?.post.followedByMe).toBe(true);
  });

  it('baska post cache i dokunulmadan kalir', () => {
    const data = { post: post('p1', 'a1') };
    expect(patchPostFollowed(data, 'p9', true)).toBe(data);
  });

  it('post yoksa cache korunur', () => {
    expect(patchPostFollowed(undefined, 'p1', true)).toBeUndefined();
  });
});
