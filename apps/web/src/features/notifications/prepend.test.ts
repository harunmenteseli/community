import { describe, expect, it } from 'vitest';
import { prependNotification } from './useRealtimeNotifications';
import type { AppNotification } from './api';

const notification = (id: string): AppNotification => ({
  id,
  type: 'follow',
  entityType: 'user',
  entityId: 'u1',
  payload: null,
  readAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  actor: { id: 'u2', username: 'yazar', name: 'Yazar', avatarUrl: null },
});

const cache = {
  pages: [
    { items: [notification('n1'), notification('n2')], nextCursor: '2' },
    { items: [notification('n3')], nextCursor: null },
  ],
  pageParams: [undefined, '2'],
};

describe('prependNotification', () => {
  it('yeni bildirimi ilk sayfanin basina ekler', () => {
    const next = prependNotification(cache, notification('yeni')) as typeof cache;
    const firstPage = next.pages[0];
    const secondPage = next.pages[1];
    expect(firstPage?.items[0]?.id).toBe('yeni');
    expect(firstPage?.items).toHaveLength(3);
    expect(secondPage?.items[0]?.id).toBe('n3');
  });

  it('ayni bildirimi iki kez eklemez', () => {
    expect(prependNotification(cache, notification('n1'))).toBe(cache);
  });

  it('sayfa yapisi degiskense cache aynen kalir', () => {
    expect(prependNotification(undefined, notification('yeni'))).toBeUndefined();
    expect(prependNotification({ pages: [] }, notification('yeni'))).toEqual({ pages: [] });
    expect(prependNotification({ pages: [{ nextCursor: null }] }, notification('yeni'))).toEqual({
      pages: [{ nextCursor: null }],
    });
  });
});
