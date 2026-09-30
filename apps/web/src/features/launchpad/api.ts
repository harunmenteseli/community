import { http } from '../../lib/api';
import type { Project, ProjectImage } from '../projects/api';

export type LaunchpadSort = 'yeni' | 'puan';

export interface LaunchpadFeedback {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  // API `listFeedback` sonucu yazari `author` altinda donuyor.
  author: { id: string; username: string; name: string; avatarUrl: string | null };
}

export interface LaunchpadProject extends Project {
  owner: { id: string; username: string; name: string; avatarUrl: string | null; bio: string | null } | null;
}

export interface MyFeedback {
  rating: number;
  comment: string | null;
  createdAt: string;
}

export type { ProjectImage };

export const launchpadApi = {
  list: (params: { sort?: LaunchpadSort; cursor?: string | null; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.sort) query.set('sort', params.sort);
    if (params.cursor) query.set('cursor', params.cursor);
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return http.get<{ projects: LaunchpadProject[]; nextCursor: string | null }>(`/api/launchpad${qs ? `?${qs}` : ''}`);
  },

  detail: (id: string) =>
    http.get<{
      project: LaunchpadProject;
      feedback: LaunchpadFeedback[];
      feedbackNextCursor: string | null;
      myFeedback: MyFeedback | null;
    }>(`/api/launchpad/${id}`),

  feedback: (id: string, input: { rating: number; comment?: string }) =>
    http.post<{ success: true }>(`/api/launchpad/${id}/feedback`, input),

  launch: (id: string) => http.post<{ success: true }>(`/api/launchpad/${id}/launch`),

  unlaunch: (id: string) => http.post<{ success: true }>(`/api/launchpad/${id}/unlaunch`),
};
