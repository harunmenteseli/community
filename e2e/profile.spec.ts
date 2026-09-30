import { createAccount, expect, profileStat, signInViaUi, test } from './fixtures';

test.describe('profil sayfasi', () => {
  test('profil bilgileri ve istatistikler gorunur', async ({ page, api }) => {
    const account = await createAccount(api, 'profil');
    await api.patch('/api/users/me', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { name: 'Profil Testi', bio: 'Merhaba ben gelistiriciyim', siteUrl: 'https://example.com' },
    });

    await page.goto(`/u/${account.username}`);

    await expect(page.getByRole('heading', { name: 'Profil Testi' })).toBeVisible();
    await expect(page.getByText('@' + account.username)).toBeVisible();
    await expect(page.getByText('Merhaba ben gelistiriciyim')).toBeVisible();
    await expect(page.getByRole('link', { name: 'example.com' })).toHaveAttribute('href', 'https://example.com');

    // Istatistikler: post, vitrin, takipci, takip
    await expect(profileStat(page, 'Takipçi')).toHaveText('0');
    await expect(profileStat(page, 'Post')).toHaveText('0');
  });

  test('post sayacı yayınlanan postu yansitir', async ({ page, api }) => {
    const account = await createAccount(api, 'profil');
    const created = await api.post('/api/posts', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { content: 'Profil testi icin post', category: 'genel' },
    });
    expect(created.status()).toBe(201);

    await page.goto(`/u/${account.username}`);
    await expect(profileStat(page, 'Post')).toHaveText('1');
  });

  test('kendi profilinde takip butonu yok, duzenleme var', async ({ page, api }) => {
    const account = await createAccount(api, 'profil');

    await signInViaUi(page, account);
    await page.goto(`/u/${account.username}`);

    await expect(page.getByRole('link', { name: 'Profili düzenle' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Takip et' })).toHaveCount(0);
  });

  test('takip et ve takipten cik sayaci gunceller', async ({ page, api }) => {
    const author = await createAccount(api, 'yazar');
    const follower = await createAccount(api, 'takipci');

    await signInViaUi(page, follower);
    await page.goto(`/u/${author.username}`);

    const followButton = page.getByRole('button', { name: 'Takip et' });
    await expect(followButton).toBeVisible();
    await followButton.click();

    // Optimistic: dugme aninda "Takiptesin" oluyor, sayac 1.
    await expect(page.getByRole('button', { name: 'Takiptesin' })).toBeVisible();
    await expect(profileStat(page, 'Takipçi')).toHaveText('1');

    // Kalici mi: API dogrula.
    const check = await api.get(`/api/users/${author.username}`, {
      headers: { Authorization: `Bearer ${follower.token}` },
    });
    expect(((await check.json()) as { isFollowing: boolean }).isFollowing).toBe(true);

    await page.getByRole('button', { name: 'Takiptesin' }).click();
    await expect(page.getByRole('button', { name: 'Takip et' })).toBeVisible();
    await expect(profileStat(page, 'Takipçi')).toHaveText('0');

    const after = await api.get(`/api/users/${author.username}`, {
      headers: { Authorization: `Bearer ${follower.token}` },
    });
    expect(((await after.json()) as { isFollowing: boolean }).isFollowing).toBe(false);
  });

  test('oturumsuz kullanici giris cagrisi gorur', async ({ page, api }) => {
    const account = await createAccount(api, 'profil');

    await page.goto(`/u/${account.username}`);
    // Header'daki "Giriş yap" linki ile profil kartindaki cagriyi ayirt et.
    await expect(page.getByRole('main').getByRole('link', { name: 'Giriş yap' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Takip et' })).toHaveCount(0);
  });

  test('olmayan profil 404 doner', async ({ page }) => {
    await page.goto('/u/olmayan_kullanici_xyz');
    await expect(page.getByText('Profil bulunamadı.')).toBeVisible();
  });

  test('post yazarindan profile gecis', async ({ page, api }) => {
    const account = await createAccount(api, 'yazar');
    await api.post('/api/posts', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { content: 'Yazar linki testi', category: 'genel' },
    });

    await page.goto('/feed');
    const card = page.locator('article').filter({ hasText: 'Yazar linki testi' });
    await card.getByRole('link', { name: '@' + account.username }).click();

    await expect(page).toHaveURL(new RegExp(`/u/${account.username}$`));
    await expect(page.getByRole('heading', { name: 'E2E Kullanici' })).toBeVisible();
  });
});

test.describe('profil duzenleme', () => {
  test('bilgiler guncellenip profilde gorunur', async ({ page, api }) => {
    const account = await createAccount(api, 'duzenle');

    await signInViaUi(page, account);
    await page.goto('/settings/profile');

    await page.getByLabel('Ad').fill('Guncel Ad');
    await page.getByLabel('Bio').fill('Yeni bio metni');
    await page.getByLabel('Bağlantı').fill('https://community.dev');
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page).toHaveURL(new RegExp(`/u/${account.username}$`));
    await expect(page.getByRole('heading', { name: 'Guncel Ad' })).toBeVisible();
    await expect(page.getByText('Yeni bio metni')).toBeVisible();

    // Sunucu tarafinda da kalici.
    const res = await api.get(`/api/users/${account.username}`);
    const body = (await res.json()) as { user: { name: string; bio: string; siteUrl: string } };
    expect(body.user.name).toBe('Guncel Ad');
    expect(body.user.bio).toBe('Yeni bio metni');
    expect(body.user.siteUrl).toBe('https://community.dev');
  });

  test('gecersiz baglanti reddedilir', async ({ page, api }) => {
    const account = await createAccount(api, 'duzenle');

    await signInViaUi(page, account);
    await page.goto('/settings/profile');

    await page.getByLabel('Bağlantı').fill('gectersiz adres');
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/settings\/profile$/);
  });

  test('avatar yuklenir ve profilde gorunur', async ({ page, api }) => {
    const account = await createAccount(api, 'avatar');

    // 1x1 kirmizi PNG.
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
      'base64',
    );

    await signInViaUi(page, account);
    await page.goto('/settings/profile');

    await page.setInputFiles('input[type="file"]', {
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page).toHaveURL(new RegExp(`/u/${account.username}$`));

    const res = await api.get(`/api/users/${account.username}`);
    const body = (await res.json()) as { user: { avatarUrl: string | null } };
    expect(body.user.avatarUrl).toContain('/uploads/');

    await expect(page.locator('article img').first()).toBeVisible();
  });

  test('oturumsuz erisimde login e yonlendirilir', async ({ page }) => {
    await page.goto('/settings/profile');
    await expect(page).toHaveURL(/\/login\?redirect=/);
  });

  test('api: kimliksiz profil guncellemesi 401 doner', async ({ api }) => {
    const account = await createAccount(api, 'api');

    const res = await api.patch('/api/users/me', {
      data: { name: 'Hack', bio: '', siteUrl: '' },
    });

    expect(res.status()).toBe(401);
    const after = await api.get(`/api/users/${account.username}`);
    expect(((await after.json()) as { user: { name: string } }).user.name).not.toBe('Hack');
  });

  test('api: bilinmeyen alan reddedilir', async ({ api }) => {
    const account = await createAccount(api, 'api');

    const res = await api.patch('/api/users/me', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { name: 'Test', bio: '', siteUrl: '', followerCount: 99 },
    });

    expect(res.status()).toBe(400);
  });

  test('api: olmayan profil 404 doner', async ({ api }) => {
    const res = await api.get('/api/users/olmayan_kullanici_xyz');
    expect(res.status()).toBe(404);
  });
});
