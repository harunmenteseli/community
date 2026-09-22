import type { UserPublic } from '@community/shared';

export const TOKEN_STORAGE_KEY = 'community.auth';
export interface SessionUser extends UserPublic {
  followerCount?: number;
  followingCount?: number;
}

export interface AuthState {
  token: string | null;
  user: SessionUser | null;
}

export function readAuthState(): AuthState {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    return { token: typeof parsed.token === 'string' ? parsed.token : null, user: parsed.user ?? null };
  } catch {
    return { token: null, user: null };
  }
}

export function writeAuthState(state: AuthState): void {
  if (state.token) localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(state));
  else localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export function clearAuthState(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}