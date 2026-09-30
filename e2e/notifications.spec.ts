import { createAccount, expect, signInViaUi, test } from './fixtures';

declare global {
  interface Window {
    __communityRealtime?: 'connected' | 'closed';
  }
}

const UNREAD_ACTIONS = /^Okundu işaretle:/;

async function follow(api: import('@playwright/test').APIRequestContext, token: string, username: string) {
  const res = await api.post(`/api/users/${username}/follow`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status(), await res.text()).toBe(200);
}

/** Soket baglantisi acilmadan canli bildirim testi kararsiz olur. */
async function waitForSocket(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => window.__communityRealtime === 'connected', undefined, { timeout: 15_000 });
}

test.describe('bildirimler', () => {
  test('rozet canli guncellenir, merkezden okundu isaretlenir', async ({ page, api }) => {
    const receiver = await createAccount(api, 'alici');
    const actor = await createAccount(api, 'gonderen');

    await signInViaUi(page, receiver);
    await waitForSocket(page);

    await follow(api, actor.token, receiver.username);

    // Canli: sayfa yenilenmeden rozet 1 olur ve toaster belirir.
    await expect(page.getByTestId('notification-badge')).toHaveText('1');
    await expect(page.getByText(/seni takip etmeye başladı/)).toBeVisible();

    await page.getByRole('link', { name: /bildirim/i }).click();
    await expect(page.locator('h1')).toHaveText('Bildirimler');
    await expect(page.getByRole('link', { name: /seni takip etmeye başladı/ })).toBeVisible();

    await page.getByRole('button', { name: UNREAD_ACTIONS }).first().click();
    await expect(page.getByTestId('notification-badge')).toHaveCount(0);

    // Okundu isaretlenen bildirim "Tümü" listesinde kalir, okunmamis listesinden cikar.
    await expect(page.getByRole('link', { name: /seni takip etmeye başladı/ })).toBeVisible();
    await expect(page.getByRole('button', { name: UNREAD_ACTIONS })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Okunmamış' }).click();
    await expect(page.getByText('Okunmamış bildirimin yok.')).toBeVisible();
  });

  test('filtre ve tümünü okundu işaretleme', async ({ page, api }) => {
    const receiver = await createAccount(api, 'alici');
    const first = await createAccount(api, 'birinci');
    const second = await createAccount(api, 'ikinci');

    await follow(api, first.token, receiver.username);
    await follow(api, second.token, receiver.username);

    await signInViaUi(page, receiver);
    await page.goto('/bildirimler');

    await expect(page.getByRole('button', { name: UNREAD_ACTIONS })).toHaveCount(2);

    await page.getByRole('tab', { name: 'Okunmamış' }).click();
    await expect(page.getByRole('button', { name: UNREAD_ACTIONS })).toHaveCount(2);

    await page.getByRole('button', { name: 'Tümünü okundu işaretle' }).click();
    await expect(page.getByTestId('notification-badge')).toHaveCount(0);
    await expect(page.getByText('Okunmamış bildirimin yok.')).toBeVisible();

    await page.getByRole('tab', { name: 'Tümü' }).click();
    await expect(page.getByRole('button', { name: UNREAD_ACTIONS })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /seni takip etmeye başladı/ })).toHaveCount(2);
  });

  test('okunmamis filtresi yalnizca okunmamis olanlari doner', async ({ api }) => {
    const receiver = await createAccount(api, 'alici');
    const actor = await createAccount(api, 'gonderen');
    await follow(api, actor.token, receiver.username);

    const all = await api.get('/api/notifications', {
      headers: { Authorization: `Bearer ${receiver.token}` },
    });
    expect(all.status()).toBe(200);
    const list = (await all.json()) as { items: { id: string }[] };
    expect(list.items.length).toBeGreaterThan(0);

    const read = await api.post(`/api/notifications/${list.items[0].id}/read`, {
      headers: { Authorization: `Bearer ${receiver.token}` },
    });
    expect(read.status()).toBe(200);

    const unread = await api.get('/api/notifications?filter=unread', {
      headers: { Authorization: `Bearer ${receiver.token}` },
    });
    const unreadList = (await unread.json()) as { items: { id: string }[] };
    expect(unreadList.items.map((item) => item.id)).not.toContain(list.items[0].id);

    const count = await api.get('/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${receiver.token}` },
    });
    const counter = (await count.json()) as { count: number };
    expect(counter.count).toBe(unreadList.items.length);
  });

  test('oturumsuz kullanici icerik ve api erisimi reddedilir', async ({ page, api }) => {
    const receiver = await createAccount(api, 'alici');

    await page.goto('/bildirimler');
    await expect(page.getByText('Bildirimlerini görmek için giriş yapmalısın.')).toBeVisible();

    const anonymous = await api.get('/api/notifications');
    expect(anonymous.status()).toBe(401);
    expect(receiver.token.length).toBeGreaterThan(10);
  });
});
