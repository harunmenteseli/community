import { createAccount, expect, signInViaUi, test } from './fixtures';

test.describe('post olusturma', () => {
  test('oturumlu kullanici yeni post sayfasini acar', async ({ page, api }) => {
    const account = await createAccount(api);

    await signInViaUi(page, account);
    await page.goto('/post/yeni');

    await expect(page.locator('h1')).toContainText(/yeni post/i);
  });

  test('taslak olusturulur ve taslaklar sayfasinda gorunur', async ({ page, api }) => {
    const account = await createAccount(api);

    const created = await api.post('/api/posts', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { content: 'Taslak icerik', category: 'genel', isDraft: true },
    });
    expect(created.status()).toBe(201);

    await signInViaUi(page, account);
    await page.goto('/taslaklar');

    await expect(page.getByText('Taslak icerik')).toBeVisible();
  });
});

test.describe('api dogrulama', () => {
  test('gecersiz email ile login 400 doner', async ({ api }) => {
    const res = await api.post('/api/auth/login', {
      data: { email: 'gecersiz', password: 'parola123' },
    });

    expect(res.status()).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  test('olmayan kullanici ile login 401 doner', async ({ api }) => {
    const res = await api.post('/api/auth/login', {
      data: { email: 'yok@e2e.local', password: 'YanlisParola!' },
    });

    expect(res.status()).toBe(401);
    expect((await res.json()).error.code).toBe('INVALID_CREDENTIALS');
  });

  test('post olustururken gecersiz kategori 400 doner', async ({ api }) => {
    const account = await createAccount(api);

    const res = await api.post('/api/posts', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { content: 'icerik', category: 'oyun' },
    });

    expect(res.status()).toBe(400);
  });

  test('kimliksiz post olusturma 401 doner', async ({ api }) => {
    const res = await api.post('/api/posts', {
      data: { content: 'icerik', category: 'genel' },
    });

    expect(res.status()).toBe(401);
    expect((await res.json()).error.code).toBe('UNAUTHORIZED');
  });

  test('oturumlu kullanici gecerli post olusturabilir', async ({ api }) => {
    const account = await createAccount(api);

    const res = await api.post('/api/posts', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { content: 'Gecerli icerik', category: 'soru', title: 'Soru' },
    });

    expect(res.status()).toBe(201);
    expect((await res.json()).post.id).toBeTruthy();
  });

  test('oturumsuz /api/auth/me 401 doner', async ({ api }) => {
    expect((await api.get('/api/auth/me')).status()).toBe(401);
  });

  test('oturumlu /api/auth/me kullaniciyi dondurur', async ({ api }) => {
    const account = await createAccount(api);

    const res = await api.get('/api/auth/me', {
      headers: { Authorization: `Bearer ${account.token}` },
    });

    expect(res.status()).toBe(200);
    expect((await res.json()).user.username).toBe(account.username);
  });
});
