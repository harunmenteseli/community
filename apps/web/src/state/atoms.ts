import { atom } from 'jotai';
import { readAuthState, writeAuthState, clearAuthState, type AuthState, type SessionUser } from './auth';

const stored = readAuthState();

export const authStateAtom = atom<AuthState>(stored);

export const tokenAtom = atom((get) => get(authStateAtom).token);

export const userAtom = atom<SessionUser | null>((get) => get(authStateAtom).user);

export const isAuthedAtom = atom((get) => Boolean(get(authStateAtom).token));

export const sessionIdAtom = atom((get) => get(authStateAtom).sessionId);

export const setSessionAtom = atom(
  null,
  (_get, set, payload: { token: string; sessionId?: string | null; user: SessionUser }) => {
    writeAuthState({
      token: payload.token,
      sessionId: payload.sessionId ?? null,
      user: payload.user,
    });
    set(authStateAtom, {
      token: payload.token,
      sessionId: payload.sessionId ?? null,
      user: payload.user,
    });
  },
);

export const setUserAtom = atom(
  null,
  (_get, set, user: SessionUser | null) => {
    const prev = readAuthState();
    writeAuthState({ token: prev.token, sessionId: prev.sessionId, user });
    set(authStateAtom, { token: prev.token, sessionId: prev.sessionId, user });
  },
);

export const clearSessionAtom = atom(null, (_get, set) => {
  clearAuthState();
  set(authStateAtom, { token: null, sessionId: null, user: null });
});