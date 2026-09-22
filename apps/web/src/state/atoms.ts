import { atom } from 'jotai';
import { readAuthState, writeAuthState, clearAuthState, type AuthState, type SessionUser } from './auth';

const stored = readAuthState();

export const authStateAtom = atom<AuthState>(stored);

export const tokenAtom = atom((get) => get(authStateAtom).token);

export const userAtom = atom<SessionUser | null>((get) => get(authStateAtom).user);

export const isAuthedAtom = atom((get) => Boolean(get(authStateAtom).token));

export const setSessionAtom = atom(
  null,
  (_get, set, payload: { token: string; user: SessionUser }) => {
    writeAuthState(payload);
    set(authStateAtom, { token: payload.token, user: payload.user });
  },
);

export const setUserAtom = atom(
  null,
  (_get, set, user: SessionUser | null) => {
    const prev = readAuthState();
    writeAuthState({ token: prev.token, user });
    set(authStateAtom, { token: prev.token, user });
  },
);

export const clearSessionAtom = atom(null, (_get, set) => {
  clearAuthState();
  set(authStateAtom, { token: null, user: null });
});