import type { CreateProjectDto } from '@community/shared';
import { http } from '../../lib/api';

export interface ProjectImage {
  url: string;
  type: 'logo' | 'cover';
  width: number | null;
  height: number | null;
  position: number;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  url: string;
  category: string;
  buildWith: string[] | null;
  description: string | null;
  logoUrl: string | null;
  launched: boolean;
  avgRating: number | null;
  ratingCount: number;
  createdAt: string;
  images: ProjectImage[];
}

export const projectsApi = {
  create: (input: CreateProjectDto) => http.post<{ project: { id: string } }>('/api/projects', input),

  mine: () => http.get<{ projects: Project[] }>('/api/me/projects'),

  get: (id: string) => http.get<{ project: Project }>(`/api/projects/${id}`),

  update: (id: string, input: Partial<CreateProjectDto>) => http.patch<{ project: Project }>(`/api/projects/${id}`, input),

  remove: (id: string) => http.delete<{ success: true }>(`/api/projects/${id}`),

  uploadLogo: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.upload<{ file: { url: string; width: number | null; height: number | null } }>('/api/uploads?kind=logo', form);
  },

  uploadCover: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.upload<{ file: { url: string; width: number | null; height: number | null } }>('/api/uploads?kind=cover', form);
  },
};
