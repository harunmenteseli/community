import { createPostSchema, updatePostSchema, type CreatePostDto, type UpdatePostDto, type PostCategory, type PostGame } from '@community/shared';
import { http } from '../../lib/api';

export interface PostImage {
  url: string;
  alt: string | null;
  width: number | null;
  height: number | null;
}

export interface PostAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export interface PostPollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

export interface PostPoll {
  id: string;
  question: string;
  totalVotes: number;
  myVote: string | null;
  options: PostPollOption[];
  closed: boolean;
}

export interface Post {
  id: string;
  title: string | null;
  content: string;
  category: PostCategory;
  game: PostGame | null;
  source: 'human' | 'ai';
  createdAt: string;
  updatedAt: string;
  author: PostAuthor;
  likeCount: number;
  commentCount: number;
  bookmarkCount: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  followedByMe: boolean;
  images: PostImage[];
  poll: PostPoll | null;
}

export interface StoredFile {
  url: string;
  width: number | null;
  height: number | null;
}

export const postsApi = {
  create: (input: CreatePostDto) =>
    http.post<{ post: { id: string } }>('/api/posts', createPostSchema.parse(input)),
  update: (id: string, input: UpdatePostDto) =>
    http.patch<{ success: true }>(`/api/posts/${id}`, updatePostSchema.parse(input)),
  delete: (id: string) => http.delete<{ success: true }>(`/api/posts/${id}`),
  get: (id: string) => http.get<{ post: Post }>(`/api/posts/${id}`),
  // Ayni secenege tekrar oy vermek oyu geri alir; baska secenek oyu tasiyir.
  voteOnPoll: (postId: string, optionId: string) =>
    http.post<{ poll: PostPoll }>(`/api/posts/${postId}/poll/vote`, { optionId }),
  drafts: () => http.get<{ posts: Post[] }>('/api/me/drafts'),
  uploadImage: async (file: File): Promise<StoredFile> => {
    const form = new FormData();
    form.append('file', file);
    return http.post<StoredFile>(`/api/uploads?kind=post`, form);
  },
};