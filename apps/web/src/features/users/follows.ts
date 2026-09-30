import type { Post } from '../posts/api';

export type FollowState = Pick<Post, 'followedByMe'> & { author: Pick<Post['author'], 'id'> };

/** Bir postun "yazari takip ediyor muyum" durumunu atar (toggle degil). */
export function setFollowed<T extends FollowState>(post: T, value: boolean): T {
  return post.followedByMe === value ? post : { ...post, followedByMe: value };
}

/** Feed'in infinity cache'inde ayni yazara ait tum postlari gunceller. */
export function patchFollowedInFeed<T extends FollowState & { id: string }>(
  data: { pages: { posts: T[] }[] } | undefined,
  authorId: string,
  value: boolean,
): { pages: { posts: T[] }[] } | undefined {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => (post.author.id === authorId ? setFollowed(post, value) : post)),
    })),
  };
}

/** Post detay cache'ini ({ post }) sekline gore gunceller. */
export function patchPostFollowed<T extends FollowState & { id: string }>(
  data: { post: T } | undefined,
  postId: string,
  value: boolean,
): { post: T } | undefined {
  if (!data?.post || data.post.id !== postId) return data;
  return { post: setFollowed(data.post, value) };
}
