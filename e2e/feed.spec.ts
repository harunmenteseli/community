import { createAccount, expect, signInViaUi, test, type TestAccount } from './fixtures';

async function createPost(
  api: import('@playwright/test').APIRequestContext,
  account: TestAccount,
  data: { content: string; category: string; game?: string; title?: string },
) {
  const res = await api.post('/api/posts', {
    headers: { Authorization: `Bearer ${account.token}` },
    data,
  });
  expect(res.status(), await res.text()).toBe(201);
  return res.json() as Promise<{ post: { id: string } }>;
}

test.describe('feed ucu', () => {
  test('filtresiz istek yeni postu ve cursor alanini doner', async ({ api }) => {
    const account = await createAccount(api);
    await createPost(api, account, { content: `feed temel testi ${Date.now()}`, category: 'genel' });

    const res = await api.get('/api/feed');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(Array.isArray(body.posts)).toBe(true);
    expect(body).toHaveProperty('nextCursor');
  });

  test('kategori filtresi yalnizca o kategorideki postlari doner', async ({ api }) => {
    const account = await createAccount(api);
    const marker = `kategori testi ${Date.now()}`;

    await createPost(api, account, { content: `${marker} soru`, category: 'soru' });
    await createPost(api, account, { content: `${marker} bug`, category: 'bug' });

    const res = await api.get('/api/feed?category=soru&limit=50');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.posts.length).toBeGreaterThan(0);
    expect(body.posts.every((post: { category: string }) => post.category === 'soru')).toBe(true);
    expect(body.posts.some((post: { content: string }) => post.content.includes(marker))).toBe(true);
  });

  test('oyun filtresi calisir', async ({ api }) => {
    const account = await createAccount(api);
    const marker = `oyun testi ${Date.now()}`;

    await createPost(api, account, { content: `${marker} ea-fc`, category: 'genel', game: 'ea-fc' });

    const res = await api.get('/api/feed?game=ea-fc&limit=50');
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.posts.every((post: { game: string | null }) => post.game === 'ea-fc')).toBe(true);
    expect(body.posts.some((post: { content: string }) => post.content.includes(marker))).toBe(true);
  });

  test('gecersiz kategori 400 doner', async ({ api }) => {
    const res = await api.get('/api/feed?category=bilinmeyen');

    expect(res.status()).toBe(400);
  });

  test('takip filtresi hicbir seyi takip etmeyen kullanici icin bos doner', async ({ api }) => {
    const account = await createAccount(api);

    const res = await api.get('/api/feed?filter=takip', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.posts).toEqual([]);
    expect(body.nextCursor).toBeNull();
  });

  test('takip filtresi oturumsuz istemde bos doner', async ({ api }) => {
    const res = await api.get('/api/feed?filter=takip');

    expect(res.status()).toBe(200);
    expect((await res.json()).posts).toEqual([]);
  });

  test('cursor ile sonraki sayfa gelir ve cursor ilerler', async ({ api }) => {
    const account = await createAccount(api);
    const marker = `cursor testi ${Date.now()}`;

    for (let i = 0; i < 3; i += 1) {
      await createPost(api, account, { content: `${marker} ${i}`, category: 'genel' });
    }

    const first = await api.get('/api/feed?limit=2');
    expect(first.status()).toBe(200);
    const firstBody = await first.json();
    expect(firstBody.posts).toHaveLength(2);
    expect(typeof firstBody.nextCursor).toBe('string');

    const second = await api.get(`/api/feed?limit=2&cursor=${encodeURIComponent(firstBody.nextCursor)}`);
    expect(second.status()).toBe(200);

    const secondBody = await second.json();
    const firstIds = new Set(firstBody.posts.map((post: { id: string }) => post.id));
    expect(secondBody.posts.every((post: { id: string }) => !firstIds.has(post.id))).toBe(true);
  });

  test('trend filtresi gecerli bir sayfa doner', async ({ api }) => {
    const res = await api.get('/api/feed?filter=trend&limit=5');

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.posts)).toBe(true);
    expect(body.posts.length).toBeLessThanOrEqual(5);
  });
});

test.describe('feed arayuzu', () => {
  test('feed sayfasi filtreleri ve postlari gosterir', async ({ page, api }) => {
    const account = await createAccount(api);
    const marker = `arayuz testi ${Date.now()}`;
    await createPost(api, account, { content: marker, category: 'genel' });

    await page.goto('/feed');

    await expect(page.locator('h1')).toContainText(/feed/i);
    await expect(page.getByRole('tab', { name: 'Yeni' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Trend' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Takip' })).toBeVisible();
    await expect(page.getByText(marker).first()).toBeVisible();
  });

  test('kategori filtresi secilince liste daralir', async ({ page, api }) => {
    const account = await createAccount(api);
    await createPost(api, account, { content: `soru filtresi ${Date.now()}`, category: 'soru' });

    await page.goto('/feed');
    await page.getByRole('button', { name: 'Soru', exact: true }).click();

    await expect(page.getByRole('button', { name: 'Soru', exact: true })).toHaveAttribute('aria-pressed', 'true');
  });

  test('post karti detay sayfasina gider', async ({ page, api }) => {
    const account = await createAccount(api);
    const marker = `detay testi ${Date.now()}`;
    const created = await createPost(api, account, { content: marker, category: 'genel', title: `Baslik ${marker}` });

    await page.goto(`/post/${created.post.id}`);

    await expect(page.locator('h1')).toContainText(`Baslik ${marker}`);
    await expect(page.getByText(marker, { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: /yorumlar/i })).toBeVisible();
  });

  test('post kartindan yazari takip et ve birak', async ({ page, api }) => {
    const author = await createAccount(api, 'yazar');
    const follower = await createAccount(api, 'takipci');
    const marker = `kart takibi ${Date.now()}`;
    await createPost(api, author, { content: marker, category: 'genel', title: `Kart ${marker}` });

    await signInViaUi(page, follower);
    await page.goto('/feed');

    const card = page.getByRole('article').filter({ hasText: `Kart ${marker}` });
    const followButton = card.getByRole('button', { name: `Takip et: @${author.username}` });
    await expect(followButton).toBeVisible();
    await followButton.click();

    // Optimistic: dugme aninda "Takiptesin" oluyor, sunucu istegi bitmeden once.
    await expect(card.getByRole('button', { name: `Takipten çık: @${author.username}` })).toBeVisible();

    const check = await api.get(`/api/users/${author.username}`, {
      headers: { Authorization: `Bearer ${follower.token}` },
    });
    expect(((await check.json()) as { isFollowing: boolean }).isFollowing).toBe(true);

    await card.getByRole('button', { name: `Takipten çık: @${author.username}` }).click();
    await expect(card.getByRole('button', { name: `Takip et: @${author.username}` })).toBeVisible();

    const after = await api.get(`/api/users/${author.username}`, {
      headers: { Authorization: `Bearer ${follower.token}` },
    });
    expect(((await after.json()) as { isFollowing: boolean }).isFollowing).toBe(false);
  });

  test('olmayan post detay sayfasi 404 durumu gosterir', async ({ page }) => {
    await page.goto('/post/550e8400-e29b-41d4-a716-446655440000');

    await expect(page.getByText(/post bulunamad/i)).toBeVisible();
  });

  test('oturumlu kullanici yorum yazabilir', async ({ page, api }) => {
    const author = await createAccount(api);
    const created = await createPost(api, author, { content: `yorum testi ${Date.now()}`, category: 'genel' });

    const reader = await createAccount(api);
    await signInViaUi(page, reader);
    await page.goto(`/post/${created.post.id}`);

    const marker = `yorum ${Date.now()}`;
    await page.locator('#comment-content').fill(marker);
    await page.getByRole('button', { name: /yorum g.nder/i }).click();

    await expect(page.getByText(marker)).toBeVisible();
  });
});
