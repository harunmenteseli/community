import { createAccount, expect, profileStat, signInViaUi, test } from './fixtures';

const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('vitrin kaydi CRUD', () => {
  test('yeni kayit olusturulur ve profilde gorunur', async ({ page, api }) => {
    const account = await createAccount(api, 'vitrin');

    await signInViaUi(page, account);
    await page.goto('/vitrin');

    await expect(page.getByRole('heading', { name: 'Vitrin kayitlarım' })).toBeVisible();
    await expect(page.getByText('Henüz vitrin kaydın yok.')).toBeVisible();

    await page.getByRole('link', { name: 'Vitrin kaydı ekle' }).click();
    await expect(page).toHaveURL(/\/vitrin\/yeni$/);

    await page.getByLabel('Ad').fill('Sınav Çalışıcı');
    await page.getByLabel('Bağlantı').fill('https://example.com/proje');
    await page.getByLabel('Kategori').selectOption('web');

    // buildWith: Enter ile etiket ekleme
    await page.getByLabel('Nelerle geliştirildi').fill('React');
    await page.getByRole('button', { name: 'Ekle', exact: true }).click();
    await page.getByLabel('Nelerle geliştirildi').fill('Node.js');
    await page.getByLabel('Nelerle geliştirildi').press('Enter');

    await expect(page.getByLabel('React etiketini kaldır')).toBeVisible();
    await expect(page.getByLabel('Node.js etiketini kaldır')).toBeVisible();

    await page.getByLabel('Açıklama').fill('Soru bankasi ve konu anlatimlari');
    await page.getByRole('button', { name: 'Vitrin kaydı oluştur' }).click();

    await expect(page).toHaveURL(/\/vitrin$/);
    await expect(page.getByText('Vitrin kaydı eklendi')).toBeVisible();

    // Liste ve API dogrulamasi
    const item = page.getByRole('listitem').filter({ hasText: 'Sınav Çalışıcı' });
    await expect(item).toBeVisible();
    await expect(item.getByText('web · React, Node.js · taslak')).toBeVisible();

    const res = await api.get('/api/me/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    expect(res.status()).toBe(200);
    const body = (await res.json()) as {
      projects: { id: string; name: string; url: string; category: string; buildWith: string[]; description: string; launched: boolean }[];
    };
    expect(body.projects).toHaveLength(1);
    expect(body.projects[0]?.name).toBe('Sınav Çalışıcı');
    expect(body.projects[0]?.buildWith).toEqual(['React', 'Node.js']);
    expect(body.projects[0]?.launched).toBe(false);

    // Profilde vitrin sayaci 1; ancak taslak kayit herkese acik degil
    await page.goto(`/u/${account.username}`);
    await expect(profileStat(page, 'Vitrin')).toHaveText('1');
    await expect(page.getByRole('main').getByText('Henüz vitrin kaydı yok.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sınav Çalışıcı' })).toHaveCount(0);

    // Yayina alininca profilde gorunur
    const launched = await api.patch(`/api/projects/${body.projects[0]?.id as string}`, {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { launched: true },
    });
    expect(launched.status()).toBe(200);

    await page.reload();
    await expect(page.getByRole('link', { name: 'Sınav Çalışıcı' })).toBeVisible();
  });

  test('kayit duzenlenir', async ({ page, api }) => {
    const account = await createAccount(api, 'vitrin');
    const created = await api.post('/api/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: {
        name: 'Eski Ad',
        url: 'https://example.com/eski',
        category: 'web',
        buildWith: ['Vue'],
        description: 'Eski aciklama',
      },
    });
    expect(created.status()).toBe(201);

    await signInViaUi(page, account);
    await page.goto('/vitrin');

    await page.getByRole('link', { name: 'Eski Ad kaydını düzenle' }).click();
    await expect(page.getByRole('heading', { name: 'Vitrin kaydını düzenle' })).toBeVisible();

    await expect(page.getByLabel('Ad')).toHaveValue('Eski Ad');
    await expect(page.getByLabel('Açıklama')).toHaveValue('Eski aciklama');
    await expect(page.getByLabel('Vue etiketini kaldır')).toBeVisible();

    await page.getByLabel('Ad').fill('Yeni Ad');
    await page.getByLabel('Vue etiketini kaldır').click();
    await page.getByLabel('Nelerle geliştirildi').fill('Svelte');
    await page.getByLabel('Nelerle geliştirildi').press('Enter');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page).toHaveURL(/\/vitrin$/);
    await expect(page.getByText('Vitrin kaydı güncellendi')).toBeVisible();
    await expect(page.getByRole('listitem').filter({ hasText: 'Yeni Ad' })).toBeVisible();

    const res = await api.get('/api/me/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    const body = (await res.json()) as { projects: { name: string; buildWith: string[]; launched: boolean }[] };
    expect(body.projects[0]?.name).toBe('Yeni Ad');
    expect(body.projects[0]?.buildWith).toEqual(['Svelte']);
    expect(body.projects[0]?.launched).toBe(true);
  });

  test('kayit silinir', async ({ page, api }) => {
    const account = await createAccount(api, 'vitrin');
    await api.post('/api/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { name: 'Silinecek', url: 'https://example.com/sil', category: 'oyun', buildWith: [], description: '' },
    });

    await signInViaUi(page, account);
    await page.goto('/vitrin');

    await page.getByRole('button', { name: 'Silinecek kaydını sil' }).click();
    await expect(page.getByText('Bu kayıt silinsin mi?')).toBeVisible();
    await page.getByRole('button', { name: 'Evet, sil' }).click();

    await expect(page.getByText('Vitrin kaydı silindi')).toBeVisible();
    await expect(page.getByText('Henüz vitrin kaydın yok.')).toBeVisible();

    const res = await api.get('/api/me/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    const body = (await res.json()) as { projects: unknown[] };
    expect(body.projects).toHaveLength(0);
  });

  test('logo ve kapak gorselleri yuklenir', async ({ page, api }) => {
    const account = await createAccount(api, 'vitrin');

    await signInViaUi(page, account);
    await page.goto('/vitrin/yeni');

    await page.getByLabel('Ad').fill('Gorselli Kayit');
    await page.getByLabel('Bağlantı').fill('https://example.com/gorselli');

    await page.setInputFiles('input[aria-label="Logo dosyasi"]', {
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });
    await expect(page.locator('form img[alt=""]')).toBeVisible();

    await page.setInputFiles('input[aria-label="Kapak dosyasi"]', {
      name: 'cover.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });

    await page.getByRole('button', { name: 'Vitrin kaydı oluştur' }).click();
    await expect(page).toHaveURL(/\/vitrin$/);

    const res = await api.get('/api/me/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
    });
    const body = (await res.json()) as {
      projects: { logoUrl: string | null; images: { type: string; url: string }[] }[];
    };
    expect(body.projects[0]?.logoUrl).toContain('/uploads/');
    expect(body.projects[0]?.images.filter((i) => i.type === 'logo')).toHaveLength(1);
    expect(body.projects[0]?.images.filter((i) => i.type === 'cover')).toHaveLength(1);
  });

  test('oturumsuz erisimde giris cagrisi gorunur', async ({ page }) => {
    await page.goto('/vitrin');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Giriş gerekli' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'Giriş yap' })).toBeVisible();

    await page.goto('/vitrin/yeni');
    await expect(page.getByRole('main').getByRole('heading', { name: 'Giriş gerekli' })).toBeVisible();
  });

  test('api: gecersiz veri 400, kimliksiz istek 401 doner', async ({ api }) => {
    const account = await createAccount(api, 'vitrin');

    const badUrl = await api.post('/api/projects', {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { name: 'Hatali', url: 'gecersiz-url', category: 'web', buildWith: [], description: '' },
    });
    expect(badUrl.status()).toBe(400);

    const unauth = await api.post('/api/projects', {
      data: { name: 'Anonim', url: 'https://example.com', category: 'web', buildWith: [], description: '' },
    });
    expect(unauth.status()).toBe(401);
  });

  test('api: baskasinin kaydi duzenlenemez ve silinemez', async ({ api }) => {
    const owner = await createAccount(api, 'vitrin');
    const other = await createAccount(api, 'vitrin');
    const created = await api.post('/api/projects', {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: { name: 'Sahibin Kaydi', url: 'https://example.com/sahip', category: 'web', buildWith: [], description: '' },
    });
    const body = (await created.json()) as { project: { id: string } };

    const res = await api.patch(`/api/projects/${body.project.id}`, {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { name: 'Calinmis' },
    });
    expect(res.status()).toBe(403);

    const del = await api.delete(`/api/projects/${body.project.id}`, {
      headers: { Authorization: `Bearer ${other.token}` },
    });
    expect(del.status()).toBe(403);

    // Kayit duruyor mu?
    const still = await api.get(`/api/projects/${body.project.id}`);
    expect(still.status()).toBe(200);
  });
});
