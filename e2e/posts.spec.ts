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

test.describe('anket', () => {
  async function createPollPost(api: import('@playwright/test').APIRequestContext, token: string) {
    const res = await api.post('/api/posts', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        content: '<p>Hangi oyun?</p>',
        category: 'soru',
        title: 'Oyun secimi',
        poll: { question: 'Hangi oyunu oynuyorsun?', options: [{ text: 'A' }, { text: 'B' }] },
      },
    });
    expect(res.status()).toBe(201);
    const { post } = (await res.json()) as { post: { id: string } };
    return post.id;
  }

  test('editor anket ekleyip yayinlayabilir', async ({ page, api }) => {
    const account = await createAccount(api);
    await signInViaUi(page, account);
    await page.goto('/post/yeni');

    await page.locator('input[placeholder="Başlık (isteğe bağlı)"]').fill('Oyun secimi');
    await page.locator('.prose-editor').fill('Anketli icerik');
    await page.getByRole('button', { name: 'Anket ekle' }).click();
    await page.locator('input[aria-label="Anket sorusu"]').fill('Hangi oyunu oynuyorsun?');
    await page.locator('input[aria-label="1. seçenek"]').fill('Anket A');
    await page.locator('input[aria-label="2. seçenek"]').fill('Anket B');

    // Secenek ekleyip cikarma calisiyor mu?
    await page.getByRole('button', { name: 'Seçenek ekle' }).click();
    await expect(page.locator('input[aria-label="3. seçenek"]')).toBeVisible();
    await page.getByRole('button', { name: '3. seçeneği kaldır' }).click();
    await expect(page.locator('input[aria-label="3. seçenek"]')).toHaveCount(0);

    await page.getByRole('button', { name: 'Yayınla' }).first().click();
    // Onizlemede anket sorusu ve secenekler gorunmeli.
    await expect(page.getByRole('dialog')).toContainText('Hangi oyunu oynuyorsun?');
    await page.getByRole('button', { name: 'Yayınla' }).last().click();

    await expect(page).toHaveURL(/\/feed$/);
    // Yayinlanan post anketle birlikte feed'de.
    await expect(page.getByText('Hangi oyunu oynuyorsun?').first()).toBeVisible();
  });

  test('eksik soru ile yayinlama engellenir', async ({ page, api }) => {
    const account = await createAccount(api);
    await signInViaUi(page, account);
    await page.goto('/post/yeni');

    await page.locator('.prose-editor').fill('Icerik');
    await page.getByRole('button', { name: 'Anket ekle' }).click();
    await page.locator('input[aria-label="1. seçenek"]').fill('A');
    await page.locator('input[aria-label="2. seçenek"]').fill('B');

    await page.getByRole('button', { name: 'Yayınla' }).first().click();
    // Soru bos: hem editor uyarisi hem onizleme uyarisi gorunur.
    await expect(page.getByText('Anket sorusu zorunlu').first()).toBeVisible();
    // Modal kapanmamis, post yayinlanmamis.
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('oy verilince yuzde ve toplam oy guncellenir', async ({ page, api }) => {
    const account = await createAccount(api);
    const postId = await createPollPost(api, account.token);

    await signInViaUi(page, account);
    await page.goto(`/post/${postId}`);

    await expect(page.getByText('Henüz oy yok.')).toBeVisible();
    await page.locator('button[data-option-text="A"]').click();

    await expect(page.getByText('1 oy')).toBeVisible();
    await expect(page.getByText('100%').first()).toBeVisible();
    await expect(page.getByText('(oyun)')).toBeVisible();
  });
  test('tek oy kurali: baska secenek oyu tasiyor, ayni secenek oyu geri aliyor', async ({ page, api }) => {
    const account = await createAccount(api);
    const postId = await createPollPost(api, account.token);

    await signInViaUi(page, account);
    await page.goto(`/post/${postId}`);

    await page.locator('button[data-option-text="A"]').click();
    await expect(page.getByText('(oyun)')).toBeVisible();
    await expect(page.getByText('1 oy')).toBeVisible();

    // Baska secenek: oy tasiyor, toplam degismiyor.
    await page.locator('button[data-option-text="B"]').click();
    await expect(page.getByText('1 oy')).toBeVisible();

    // Ayni secenek tekrar: oy geri aliniyor.
    await page.locator('button[data-option-text="B"]').click();
    await expect(page.getByText('Henüz oy yok.')).toBeVisible();
    await expect(page.getByText('(oyun)')).toHaveCount(0);
  });

  test('oturumsuz kullanici oy veremez', async ({ page, api }) => {
    const account = await createAccount(api);
    const postId = await createPollPost(api, account.token);

    await page.goto(`/post/${postId}`);

    await expect(page.locator('button[data-option-text="A"]')).toBeDisabled();
    await expect(page.getByText('Oylamak için giriş yapmalısın.')).toBeVisible();
    // Yorum bolumu da giris cagirisi iceriyor; ilk olan anketin cagrisi.
    await page.getByRole('main').getByRole('link', { name: 'Giriş yap' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/login\\?redirect=%2Fpost%2F${postId}`));
  });

  test('api: gecersiz secenek ile oy 400 doner', async ({ api }) => {
    const account = await createAccount(api);
    const postId = await createPollPost(api, account.token);

    const res = await api.post(`/api/posts/${postId}/poll/vote`, {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { optionId: 'olmayan-secene' },
    });

    expect(res.status()).toBe(400);
  });

  test('api: kimliksiz oy 401 doner', async ({ api }) => {
    const account = await createAccount(api);
    const postId = await createPollPost(api, account.token);

    const res = await api.post(`/api/posts/${postId}/poll/vote`, { data: { optionId: 'x' } });

    expect(res.status()).toBe(401);
  });

  test('api: anketi olmayan postta oy 404 doner', async ({ api }) => {
    const account = await createAccount(api);
    const created = await api.post('/api/posts', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { content: 'Anketsiz icerik', category: 'genel' },
    });
    const { post } = (await created.json()) as { post: { id: string } };

    const res = await api.post(`/api/posts/${post.id}/poll/vote`, {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { optionId: 'x' },
    });

    expect(res.status()).toBe(404);
  });

  test('api: iki kullanici oylarini toplar', async ({ api }) => {
    const author = await createAccount(api);
    const postId = await createPollPost(api, author.token);
    const detail = await api.get(`/api/posts/${postId}`, {
      headers: { Authorization: `Bearer ${author.token}` },
    });
    const poll = ((await detail.json()) as { post: { poll: { options: { id: string }[] } } }).post.poll;

    const voter = await createAccount(api);
    const vote = await api.post(`/api/posts/${postId}/poll/vote`, {
      headers: { Authorization: `Bearer ${voter.token}` },
      data: { optionId: poll.options[0].id },
    });

    expect(vote.status()).toBe(200);
    const body = (await vote.json()) as { poll: { totalVotes: number; percentage: number } };
    expect(body.poll.totalVotes).toBe(1);
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
