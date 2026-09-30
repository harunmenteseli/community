import { createAccount, expect, signInViaUi, test } from './fixtures';

async function createPost(
  api: import('@playwright/test').APIRequestContext,
  token: string,
  content = 'Begenme testi icerigi',
) {
  const res = await api.post('/api/posts', {
    headers: { Authorization: `Bearer ${token}` },
    data: { content, category: 'genel' },
  });
  expect(res.status()).toBe(201);
  const { post } = (await res.json()) as { post: { id: string } };
  return post.id;
}

test.describe('begenme ve kaydetme', () => {
  test('begenme sayaci artar ve azalir', async ({ page, api }) => {
    const account = await createAccount(api);
    const postId = await createPost(api, account.token);

    await signInViaUi(page, account);
    await page.goto(`/post/${postId}`);

    const like = page.getByRole('button', { name: 'Beğen' });
    await expect(like).toHaveAttribute('aria-pressed', 'false');
    await like.click();

    // Optimistik UI: sunucu donmeden sayac 1 olmali.
    const liked = page.getByRole('button', { name: 'Beğeniyi kaldır' });
    await expect(liked).toHaveAttribute('aria-pressed', 'true');
    await expect(liked).toContainText('1');

    await liked.click();
    await expect(page.getByRole('button', { name: 'Beğen' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Beğen' })).toContainText('0');
  });

  test('kaydetme durumu degisir', async ({ page, api }) => {
    const account = await createAccount(api);
    const postId = await createPost(api, account.token);

    await signInViaUi(page, account);
    await page.goto(`/post/${postId}`);

    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByRole('button', { name: 'Kaydı kaldır' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Kaydı kaldır' }).click();
    await expect(page.getByRole('button', { name: 'Kaydet' })).toHaveAttribute('aria-pressed', 'false');
  });

  test('begenme feed kartinda da gorunur ve kart ile detay esitlenir', async ({ page, api }) => {
    const account = await createAccount(api);
    const postId = await createPost(api, account.token, 'Feed kartinda begenme');

    await signInViaUi(page, account);
    await page.goto('/feed');

    const card = page.locator('article').filter({ hasText: 'Feed kartinda begenme' });
    await expect(card.getByRole('button', { name: 'Beğen' })).toBeVisible();
    await card.getByRole('button', { name: 'Beğen' }).click();
    await expect(card.getByRole('button', { name: 'Beğeniyi kaldır' })).toContainText('1');

    // Post detayinda da ayni durum gorunmeli (cache esitlendi).
    await page.goto(`/post/${postId}`);
    await expect(page.getByRole('button', { name: 'Beğeniyi kaldır' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('oturumsuz kullanici begenince girise yonlendirilir', async ({ page, api }) => {
    const account = await createAccount(api);
    const postId = await createPost(api, account.token);

    await page.goto(`/post/${postId}`);
    await page.getByRole('button', { name: 'Beğen' }).click();

    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=%2Fpost%2F${postId}`));
  });

  test('sunucu hatasinda sayac geri alinir', async ({ page, api }) => {
    const account = await createAccount(api);
    const postId = await createPost(api, account.token);

    await signInViaUi(page, account);
    await page.goto(`/post/${postId}`);

    // Ilk istek hata dondurur. Cevap test serbest birakilana kadar bekletilir,
    // boylece optimistic durum kesin gorulebilir.
    let failing = true;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let pending = 0;

    await page.route('**/api/posts/*/like', async (route) => {
      if (!failing) return route.fallback();
      pending += 1;
      await gate;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { code: 'INTERNAL', message: 'Sunucu hatasi' } }),
      });
    });

    await page.getByRole('button', { name: 'Beğen' }).click();
    await expect.poll(() => pending).toBe(1);
    // Optimistic: sunucu cevabi gelmeden begenmis gibi gorunur.
    await expect(page.getByRole('button', { name: 'Beğeniyi kaldır' })).toContainText('1');

    // Hata gelince eski duruma doner.
    release();
    await expect(page.getByRole('button', { name: 'Beğen' })).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByRole('button', { name: 'Beğen' })).toContainText('0');

    // Duzelen istek artik kalici olmali.
    failing = false;
    await page.getByRole('button', { name: 'Beğen' }).click();
    await expect(page.getByRole('button', { name: 'Beğeniyi kaldır' })).toContainText('1');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Beğeniyi kaldır' })).toContainText('1');
  });

  test('baska kullanici begenince toplam sayi artar', async ({ page, api }) => {
    const author = await createAccount(api);
    const postId = await createPost(api, author.token);
    const liker = await createAccount(api);

    // Once yazar beğensin.
    await signInViaUi(page, author);
    await page.goto(`/post/${postId}`);
    await page.getByRole('button', { name: 'Beğen' }).click();
    await expect(page.getByRole('button', { name: 'Beğeniyi kaldır' })).toContainText('1');

    // Ikinci kullanici API uzerinden beğensin, sonra yazar sayfayi yenilesin.
    const vote = await api.post(`/api/posts/${postId}/like`, {
      headers: { Authorization: `Bearer ${liker.token}` },
    });
    expect(vote.status()).toBe(200);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Beğeniyi kaldır' })).toContainText('2');
  });

  test('kendi postunu begenince kendine bildirim olusmaz', async ({ api }) => {
    const account = await createAccount(api);
    const postId = await createPost(api, account.token);

    const res = await api.post(`/api/posts/${postId}/like`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });

    expect(res.status()).toBe(200);
    const notifications = await api.get('/api/notifications', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(notifications.status()).toBe(200);
    const body = (await notifications.json()) as { items: { type: string }[] };
    expect(body.items.filter((n) => n.type === 'like')).toHaveLength(0);
  });

  test('api: kimliksiz begenme 401 doner', async ({ api }) => {
    const account = await createAccount(api);
    const postId = await createPost(api, account.token);

    const res = await api.post(`/api/posts/${postId}/like`);

    expect(res.status()).toBe(401);
  });

  test('api: olmayan postu begenme 404 doner', async ({ api }) => {
    const account = await createAccount(api);

    const res = await api.post('/api/posts/00000000-0000-0000-0000-000000000000/like', {
      headers: { Authorization: `Bearer ${account.token}` },
    });

    expect(res.status()).toBe(404);
  });

  test('api: begenme ve kaydetme durumu post cevabinda yansitir', async ({ api }) => {
    const account = await createAccount(api);
    const postId = await createPost(api, account.token);
    const headers = { Authorization: `Bearer ${account.token}` };

    await api.post(`/api/posts/${postId}/like`, { headers });
    await api.post(`/api/posts/${postId}/bookmark`, { headers });

    const detail = await api.get(`/api/posts/${postId}`, { headers });
    const body = (await detail.json()) as {
      post: { likedByMe: boolean; likeCount: number; bookmarkedByMe: boolean; bookmarkCount: number };
    };
    expect(body.post).toMatchObject({
      likedByMe: true,
      likeCount: 1,
      bookmarkedByMe: true,
      bookmarkCount: 1,
    });

    // Ikinci kez basmak durumu kaldirir.
    await api.post(`/api/posts/${postId}/like`, { headers });
    const after = await api.get(`/api/posts/${postId}`, { headers });
    const afterBody = (await after.json()) as { post: { likedByMe: boolean; likeCount: number } };
    expect(afterBody.post).toMatchObject({ likedByMe: false, likeCount: 0 });
  });
});
