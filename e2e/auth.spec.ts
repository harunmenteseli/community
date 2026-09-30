import { expect, test } from './fixtures';

test.describe('saglik ve temel sayfalar', () => {
  test('ana sayfa yuklenir ve hero metni gorunur', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('topluluk');
  });

  test('api saglik ucu 200 doner', async ({ api }) => {
    const res = await api.get('/health');

    expect(res.status()).toBe(200);
    expect((await res.json()).status).toBe('ok');
  });

  test('api proxy uzerinden erisilebilir', async ({ page }) => {
    const res = await page.request.get('/api/auth/me');

    // Oturumsuz istek 401 donmeli, yani route ve proxy ayakta.
    expect(res.status()).toBe(401);
  });

  test('bilinmeyen rota 404 sayfasi gosterir', async ({ page }) => {
    await page.goto('/boyle-bir-sayfa-yok');

    await expect(page.getByText('404')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Sayfa bulunamad');
  });
});

test.describe('auth sayfalari', () => {
  test('kayit ol formu dogrulama hatalarini gosterir', async ({ page }) => {
    await page.goto('/register');

    await page.locator('button[type="submit"]').click();

    await expect(page.getByRole('alert').first()).toBeVisible();
  });

  test('kayit ol -> ana sayfaya yonlendirir ve oturum kurar', async ({ page }) => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
    const username = `e2e_${stamp}`.slice(0, 30);

    await page.goto('/register');
    await page.locator('input[name="name"]').fill('E2E Kullanici');
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="email"]').fill(`${username}@e2e.local`);
    await page.locator('input[name="password"]').fill('E2eParola123!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/$/);

    const stored = await page.evaluate(() => localStorage.getItem('community.auth'));
    expect(stored).toBeTruthy();
    expect(stored).toContain(username);
  });

  test('hatali sifre ile giris reddedilir', async ({ page, api }) => {
    const username = `e2e_${Date.now().toString(36)}`.slice(0, 30);
    await api.post('/api/auth/register', {
      data: { email: `${username}@e2e.local`, password: 'E2eParola123!', name: 'E2E', username },
    });

    await page.goto('/login');
    await page.locator('input[name="email"]').fill(`${username}@e2e.local`);
    await page.locator('input[name="password"]').fill('YanlisParola!');
    await page.locator('button[type="submit"]').click();

    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('sifre sifirlama sayfasi yuklenir', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});
