import { beforeEach, describe, expect, it } from 'vitest';
import { TOKEN_STORAGE_KEY, clearAuthState, readAuthState, writeAuthState } from './auth';
import type { SessionUser } from './auth';

const user: SessionUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  username: 'test_user',
  name: 'Test Kullanici',
  bio: null,
  avatarUrl: null,
  siteUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('readAuthState', () => {
  beforeEach(() => localStorage.clear());

  it('localStorage bosken bos durum doner', () => {
    expect(readAuthState()).toEqual({ token: null, sessionId: null, user: null });
  });

  it('gecerli durumu okur', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token: 'tok', sessionId: 'sid', user }));

    expect(readAuthState()).toEqual({ token: 'tok', sessionId: 'sid', user });
  });

  it('bozuk JSON yakalayip bos durum doner', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, '{bozuk');

    expect(readAuthState()).toEqual({ token: null, sessionId: null, user: null });
  });

  it('token string degilse null yapar', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify({ token: 123 }));

    expect(readAuthState().token).toBeNull();
  });
});

describe('writeAuthState', () => {
  beforeEach(() => localStorage.clear());

  it('token varsa localStorage a yazar', () => {
    writeAuthState({ token: 'tok', sessionId: null, user });

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toContain('tok');
  });

  it('token yoksa anahtari kaldirir', () => {
    writeAuthState({ token: 'tok', sessionId: null, user });
    writeAuthState({ token: null, sessionId: null, user: null });

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});

describe('clearAuthState', () => {
  it('oturum bilgisini siler', () => {
    writeAuthState({ token: 'tok', sessionId: 'sid', user });
    clearAuthState();

    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
  });
});
