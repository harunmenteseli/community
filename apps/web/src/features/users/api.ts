import type { AccountInfo, UpdateProfileDto, UserPublic } from '@community/shared';
import { http } from '../../lib/api';

export interface ProfileStats {
  followerCount: number;
  followingCount: number;
  postCount: number;
  projectCount: number;
}

export interface Profile {
  user: UserPublic;
  stats: ProfileStats;
  isFollowing: boolean;
  isSelf: boolean;
}

export interface ProfileProject {
  id: string;
  name: string;
  url: string;
  category: string;
  buildWith: string | null;
  description: string | null;
  logoUrl: string | null;
  launched: boolean;
  avgRating: number | null;
  ratingCount: number;
  createdAt: string;
}

export const usersApi = {
  profile: (username: string) => http.get<Profile>(`/api/users/${encodeURIComponent(username)}`),

  projects: (username: string) =>
    http.get<{ projects: ProfileProject[] }>(`/api/users/${encodeURIComponent(username)}/projects`),

  updateProfile: (input: UpdateProfileDto) =>
    http.patch<{ user: UserPublic & { followerCount: number; followingCount: number } }>('/api/users/me', input),

  account: () => http.get<{ account: AccountInfo }>('/api/users/me/account'),

  changeUsername: (username: string) =>
    http.patch<{ user: UserPublic & { followerCount: number; followingCount: number } }>('/api/users/me/username', {
      username,
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    http.post<{ success: true }>('/api/users/me/change-password', { currentPassword, newPassword }),

  deleteAccount: (password: string, confirmText: string) =>
    http.delete<{ success: true }>('/api/users/me', { password, confirmText }),

  follow: (username: string) => http.post<{ success: true }>(`/api/users/${encodeURIComponent(username)}/follow`),

  unfollow: (username: string) =>
    http.post<{ success: true }>(`/api/users/${encodeURIComponent(username)}/unfollow`),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.upload<{ file: { url: string } }>('/api/uploads?kind=avatar', form);
  },
};
