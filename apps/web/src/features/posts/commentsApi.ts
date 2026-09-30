import { createCommentSchema, type CreateCommentDto } from '@community/shared';
import { http } from '../../lib/api';

export interface CommentAuthor {
  id: string;
  username: string;
  name: string;
  avatarUrl: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  author: CommentAuthor;
  replyCount?: number;
  replies?: Comment[];
}

export const commentsApi = {
  list: (postId: string, cursor?: string | null) => {
    const search = new URLSearchParams();
    if (cursor) search.set('cursor', cursor);

    const query = search.toString();
    return http.get<{ comments: Comment[]; nextCursor: string | null }>(
      `/api/posts/${postId}/comments${query ? `?${query}` : ''}`,
    );
  },
  create: (input: CreateCommentDto) =>
    http.post<{ comment: Comment }>('/api/comments', createCommentSchema.parse(input)),
  remove: (id: string) => http.delete<{ success: true }>(`/api/comments/${id}`),
};
