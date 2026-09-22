import { createStore } from 'jotai';
import { authApi } from '../features/auth/api';
import { ApiError } from '../lib/api';
import { clearSessionAtom, setSessionAtom } from './atoms';
import { readAuthState } from './auth';

export const store = createStore();

export async function bootstrapAuth(): Promise<void> {
  const { token, sessionId } = readAuthState();
  if (!token) return;
  try {
    const { user } = await authApi.me();
    store.set(setSessionAtom, { token, sessionId, user });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) return;
    store.set(clearSessionAtom);
  }
}

export async function applyOAuthToken(token: string): Promise<boolean> {
  try {
    const { user } = await authApi.me();
    store.set(setSessionAtom, { token, user });
    return true;
  } catch {
    return false;
  }
}