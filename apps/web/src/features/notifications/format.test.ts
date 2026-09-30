import { describe, expect, it } from 'vitest';
import { notificationText } from './format';
import type { AppNotification } from './api';

const actor = { id: 'u1', username: 'yazar', name: 'Yazar', avatarUrl: null };

function item(overrides: Partial<AppNotification> = {}): AppNotification {
  return {
    id: 'n1',
    type: 'follow',
    entityType: 'user',
    entityId: 'u1',
    payload: null,
    readAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    actor,
    ...overrides,
  };
}

describe('notificationText', () => {
  it('takip bildirimini aktör adi ve profil linkiyle yazar', () => {
    expect(notificationText(item())).toEqual({
      text: 'Yazar seni takip etmeye başladı',
      href: '/u/yazar',
    });
  });

  it('begenme ve yorum bildirimlerini gonderiye baglar', () => {
    expect(notificationText(item({ type: 'like', entityType: 'post', entityId: 'p1' }))).toEqual({
      text: 'Yazar gönderini beğendi',
      href: '/post/p1',
    });
    expect(notificationText(item({ type: 'comment', entityType: 'post', entityId: 'p1' })).href).toBe(
      '/post/p1',
    );
    expect(notificationText(item({ type: 'reply', entityType: 'post', entityId: 'p1' })).href).toBe(
      '/post/p1',
    );
  });

  it('vitrin yayini vitrin kaydina baglar', () => {
    expect(notificationText(item({ type: 'launch', entityType: 'project', entityId: 'pr1' }))).toEqual({
      text: 'Yazar vitrin kaydını yayına aldı',
      href: '/vitrin/pr1',
    });
  });

  it('hedef turu yanlissa link uretmez', () => {
    expect(notificationText(item({ type: 'like', entityType: 'user', entityId: 'u1' })).href).toBeUndefined();
  });

  it('aktorsuz sistem bildirimini "Sistem" diye yazar', () => {
    expect(notificationText(item({ actor: null, type: 'reportUpdate' })).text).toContain('Şikâyetin');
  });

  it('sikayet sonucunu duruma gore ozetler', () => {
    const payload = { status: 'approved', targetType: 'post' };
    expect(notificationText(item({ actor: null, type: 'reportUpdate', payload })).text).toBe(
      'Şikâyetin onaylandı; gönderin incelemeye alındı',
    );
    expect(
      notificationText(item({ actor: null, type: 'reportUpdate', payload: { status: 'rejected', targetType: 'project' } }))
        .text,
    ).toBe('Şikâyetin reddedildi; vitrin kaydının için işlem yapılmadı');
  });

  it('bilinmeyen tipte genel metin doner', () => {
    expect(notificationText(item({ type: 'denemeTipi' })).text).toBe('Yazar yeni bir bildirim gönderdi');
  });
});
