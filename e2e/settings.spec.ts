import { createAccount, expect, signInViaUi, test } from './fixtures';

const API = '/api';

test.describe('ayarlar yerlesimi', () => {
  test('kimliksiz erisim login e yonlendirir ve donus adresini korur', async ({ page, api }) => {
    await page.goto('/settings/profile');
    await expect(page).toHaveURL(/\/login\?redirect=/);
    // Dönüş adresi hedef sayfayı içermeli.
    await expect(page).toHaveURL(/settings(%2F|\/)profile/);

    // Giriş sonrası kullanıcı hedef sayfaya geri dönmeli.
    const account = await createAccount(api, 'yonel');
    await page.locator('input[name="email"]').fill(account.email);
    await page.locator('input[name="password"]').fill(account.password);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/settings\/profile$/);
  });

  test('eski profil adresi yeni ayarlar adresine yonlenir', async ({ page, api }) => {
    const account = await createAccount(api, 'yonelme');
    await signInViaUi(page, account);

    await page.goto('/ayarlar/profil');
    // beforeLoad yönlendirmesi client tarafında; hedefe kadar bekle.
    await page.waitForURL(/\/settings\/profile$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Profil bilgileri' })).toBeVisible();
  });

  test('bolum menusu sayfalar arasinda gezinir', async ({ page, api }) => {
    const account = await createAccount(api, 'menu');
    await signInViaUi(page, account);

    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings\/profile$/);

    const nav = page.getByRole('navigation', { name: 'Ayar bölümleri' });
    await nav.getByRole('link', { name: /Güvenlik/ }).click();
    await expect(page).toHaveURL(/\/settings\/security$/);

    await nav.getByRole('link', { name: /Bildirimler/ }).click();
    await expect(page).toHaveURL(/\/settings\/notifications$/);

    await nav.getByRole('link', { name: /Hesap/ }).click();
    await expect(page).toHaveURL(/\/settings\/account$/);

    // Etkin bölüm aria-current ile işaretlenir.
    await expect(nav.getByRole('link', { name: /Hesap/ })).toHaveAttribute('aria-current', 'page');
  });

  test('header ayarlar baglantisi hesap sahibine gorunur', async ({ page, api }) => {
    const account = await createAccount(api, 'header');
    await signInViaUi(page, account);

    await page.goto('/feed');
    await page.getByRole('link', { name: 'Ayarlar' }).click();
    await expect(page).toHaveURL(/\/settings\/profile$/);
  });
});

test.describe('profil araclari', () => {
  test('araclar kaydedilir ve profilde gorunur', async ({ page, api }) => {
    const account = await createAccount(api, 'arac');

    await signInViaUi(page, account);
    await page.goto('/settings/profile');

    await page.getByLabel('Araçlar').fill('React, TypeScript , react, Drizzle');
    await page.getByRole('button', { name: 'Kaydet' }).click();

    await expect(page).toHaveURL(new RegExp(`/u/${account.username}$`));
    // Tekrarlanan "react" tekilleştirildi.
    await expect(page.getByRole('listitem').filter({ hasText: 'React' })).toHaveCount(1);
    await expect(page.getByText('TypeScript', { exact: true })).toBeVisible();
    await expect(page.getByText('Drizzle', { exact: true })).toBeVisible();

    const res = await api.get(`${API}/users/${account.username}`);
    const body = (await res.json()) as { user: { tools: string[] } };
    expect(body.user.tools).toEqual(['React', 'TypeScript', 'Drizzle']);
  });

  test('araclar bos birakilca temizlenir', async ({ page, api }) => {
    const account = await createAccount(api, 'arac');

    await signInViaUi(page, account);
    await page.goto('/settings/profile');
    await page.getByLabel('Araçlar').fill('Vue');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page).toHaveURL(new RegExp(`/u/${account.username}$`));

    await page.goto('/settings/profile');
    await page.getByLabel('Araçlar').fill('');
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page).toHaveURL(new RegExp(`/u/${account.username}$`));

    const res = await api.get(`${API}/users/${account.username}`);
    const body = (await res.json()) as { user: { tools: string[] } };
    expect(body.user.tools).toEqual([]);
  });

  test('api: gecersiz arac reddedilir', async ({ api }) => {
    const account = await createAccount(api, 'arac');

    const res = await api.patch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { name: 'Test', bio: '', siteUrl: '', tools: ['x'.repeat(41)] },
    });

    expect(res.status()).toBe(400);
  });

  test('api: arac gonderilmezse mevcut liste korunur', async ({ api }) => {
    const account = await createAccount(api, 'arac');
    const auth = { Authorization: `Bearer ${account.token}` };

    await api.patch(`${API}/users/me`, {
      headers: auth,
      data: { name: 'Test', bio: '', siteUrl: '', tools: ['Go'] },
    });

    // tools alanı yok: sunucu mevcut listeyi silmemeli.
    await api.patch(`${API}/users/me`, {
      headers: auth,
      data: { name: 'Test 2', bio: '', siteUrl: '' },
    });

    const res = await api.get(`${API}/users/${account.username}`);
    const body = (await res.json()) as { user: { tools: string[]; name: string } };
    expect(body.user.name).toBe('Test 2');
    expect(body.user.tools).toEqual(['Go']);
  });
});

test.describe('kullanici adi degistirme', () => {
  test('kullanici adi degistirilir ve profil adresi guncellenir', async ({ page, api }) => {
    const account = await createAccount(api, 'ad');
    const next = `yeni_${account.username.slice(-8)}`;

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    await page.getByLabel('Yeni kullanıcı adı').fill(next);
    await page.getByRole('button', { name: 'Değiştir' }).click();

    await expect(page.getByText(`Kullanıcı adın @${next} oldu`)).toBeVisible();
    await expect(page.getByText(`@${account.username}`)).toHaveCount(0);

    const res = await api.get(`${API}/users/${next}`);
    expect(res.status()).toBe(200);
    await expect(page.getByRole('link', { name: 'Ayarlar' })).toBeVisible();
  });

  test('rezerve kullanici adi reddedilir', async ({ page, api }) => {
    const account = await createAccount(api, 'ad');

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    await page.getByLabel('Yeni kullanıcı adı').fill('admin');
    await page.getByRole('button', { name: 'Değiştir' }).click();

    await expect(page.getByText('Bu kullanıcı adı kullanılamaz')).toBeVisible();
    // Mevcut ad korunur.
    const res = await api.get(`${API}/users/${account.username}`);
    expect(res.status()).toBe(200);
  });

  test('alinan kullanici adi reddedilir', async ({ page, api }) => {
    const other = await createAccount(api, 'dolu');
    const account = await createAccount(api, 'ad');

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    await page.getByLabel('Yeni kullanıcı adı').fill(other.username);
    await page.getByRole('button', { name: 'Değiştir' }).click();

    await expect(page.getByText('Bu kullanıcı adı alınmış')).toBeVisible();
  });

  test('buyuk kucuk harf farki esit sayilir', async ({ page, api }) => {
    const other = await createAccount(api, 'harf');
    const account = await createAccount(api, 'ad');

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    await page.getByLabel('Yeni kullanıcı adı').fill(other.username.toUpperCase());
    await page.getByRole('button', { name: 'Değiştir' }).click();

    await expect(page.getByText('Bu kullanıcı adı alınmış')).toBeVisible();
  });

  test('api: gecersiz bicim reddedilir', async ({ api }) => {
    const account = await createAccount(api, 'ad');

    const res = await api.patch(`${API}/users/me/username`, {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { username: 'bosluklu ad!' },
    });

    expect(res.status()).toBe(400);
  });
});

test.describe('sifre degistirme', () => {
  test('sifre degisir ve eski sifre calismaz', async ({ page, api }) => {
    const account = await createAccount(api, 'sifre');
    const next = 'YeniParola456!';

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    await page.getByLabel('Mevcut şifre').fill(account.password);
    await page.getByLabel('Yeni şifre', { exact: true }).fill(next);
    await page.getByLabel('Yeni şifre (tekrar)').fill(next);
    await page.getByRole('button', { name: 'Şifreyi güncelle' }).click();

    await expect(page.getByText('Şifren güncellendi')).toBeVisible();

    // Tarayıcıdaki oturum (şifreyi değiştiren) açık kalmalı.
    const stillIn = await api.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${await page.evaluate(() => JSON.parse(localStorage.getItem('community.auth') ?? '{}').token)}` },
    });
    expect(stillIn.status()).toBe(200);

    // Kayıt sırasındaki oturum kapanmış olmalı.
    const revoked = await api.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${account.token}` } });
    expect(revoked.status()).toBe(401);

    // Eski şifre artık giriş yapmıyor.
    const oldLogin = await api.post(`${API}/auth/login`, {
      data: { email: account.email, password: account.password },
    });
    expect(oldLogin.status()).toBe(401);

    const newLogin = await api.post(`${API}/auth/login`, {
      data: { email: account.email, password: next },
    });
    expect(newLogin.status()).toBe(200);
  });

  test('eslesmeyen sifre teyidi reddedilir', async ({ page, api }) => {
    const account = await createAccount(api, 'sifre');

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    await page.getByLabel('Mevcut şifre').fill(account.password);
    await page.getByLabel('Yeni şifre', { exact: true }).fill('YeniParola456!');
    await page.getByLabel('Yeni şifre (tekrar)').fill('BaskaParola789!');
    await page.getByRole('button', { name: 'Şifreyi güncelle' }).click();

    await expect(page.getByText('Şifreler eşleşmiyor')).toBeVisible();
    await expect(page.getByText('Şifren güncellendi')).toHaveCount(0);
  });

  test('yanlis mevcut sifre reddedilir', async ({ page, api }) => {
    const account = await createAccount(api, 'sifre');

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    await page.getByLabel('Mevcut şifre').fill('YanlisParola123!');
    await page.getByLabel('Yeni şifre', { exact: true }).fill('YeniParola456!');
    await page.getByLabel('Yeni şifre (tekrar)').fill('YeniParola456!');
    await page.getByRole('button', { name: 'Şifreyi güncelle' }).click();

    await expect(page.getByText('Mevcut şifre hatalı')).toBeVisible();
  });

  test('api: diger oturumlar kapanir', async ({ page, api }) => {
    const account = await createAccount(api, 'sifre');

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    const sessions = await api.get(`${API}/auth/sessions`, { headers: { Authorization: `Bearer ${account.token}` } });
    const body = (await sessions.json()) as { sessions: { id: string }[] };
    expect(body.sessions.length).toBe(2);

    await page.getByLabel('Mevcut şifre').fill(account.password);
    await page.getByLabel('Yeni şifre', { exact: true }).fill('YeniParola456!');
    await page.getByLabel('Yeni şifre (tekrar)').fill('YeniParola456!');
    await page.getByRole('button', { name: 'Şifreyi güncelle' }).click();
    await expect(page.getByText('Şifren güncellendi')).toBeVisible();

    // Kayıt oturumu artık geçersiz.
    const revoked = await api.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${account.token}` } });
    expect(revoked.status()).toBe(401);
  });
});

test.describe('bildirim tercihleri', () => {
  test('tercih kapatildiginda bildirim olusmaz', async ({ page, api }) => {
    const receiver = await createAccount(api, 'tercih');
    const actor = await createAccount(api, 'tercih_akt');

    await signInViaUi(page, receiver);
    await page.goto('/settings/notifications');

    const toggle = page.getByRole('switch', { name: 'Takip' });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByText('Bildirim tercihleri kaydedildi')).toBeVisible();

    await api.post(`${API}/users/${receiver.username}/follow`, {
      headers: { Authorization: `Bearer ${actor.token}` },
    });

    const res = await api.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${receiver.token}` } });
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toHaveLength(0);

    // Tercih tekrar açılınca bildirim gelir.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await api.post(`${API}/users/${receiver.username}/unfollow`, {
      headers: { Authorization: `Bearer ${actor.token}` },
    });
    await api.post(`${API}/users/${receiver.username}/follow`, {
      headers: { Authorization: `Bearer ${actor.token}` },
    });

    const after = await api.get(`${API}/notifications`, { headers: { Authorization: `Bearer ${receiver.token}` } });
    const afterBody = (await after.json()) as { items: unknown[] };
    expect(afterBody.items).toHaveLength(1);
  });

  test('tercih sayfa yenilendikten sonra korunur', async ({ page, api }) => {
    const account = await createAccount(api, 'tercih');

    await signInViaUi(page, account);
    await page.goto('/settings/notifications');

    await page.getByRole('switch', { name: 'Beğeni' }).click();
    await expect(page.getByRole('switch', { name: 'Beğeni' })).toHaveAttribute('aria-checked', 'false');

    await page.reload();
    await expect(page.getByRole('switch', { name: 'Beğeni' })).toHaveAttribute('aria-checked', 'false');
    await expect(page.getByRole('switch', { name: 'Takip' })).toHaveAttribute('aria-checked', 'true');
  });

  test('api: eksik kayit varsayilan degerlerle doner', async ({ api }) => {
    const account = await createAccount(api, 'varsayilan');

    const res = await api.get(`${API}/notifications/settings`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });

    expect(res.status()).toBe(200);
    const body = (await res.json()) as { settings: Record<string, boolean> };
    // Kayit yoksa null yerine dolu varsayilanlar gelmeli.
    expect(body.settings).toMatchObject({
      follow: true,
      comment: true,
      like: true,
      reply: true,
      mention: true,
      launch: true,
    });
  });
});

test.describe('hesap sayfasi ve hesap silme', () => {
  test('hesap bilgileri gorunur', async ({ page, api }) => {
    const account = await createAccount(api, 'hesap');

    await signInViaUi(page, account);
    await page.goto('/settings/account');

    await expect(page.getByText(account.email)).toBeVisible();
    await expect(page.getByText(`@${account.username}`)).toBeVisible();
    await expect(page.getByText('Doğrulanmadı')).toBeVisible();
  });

  test('onay eksikken silme butonu kapalidir', async ({ page, api }) => {
    const account = await createAccount(api, 'hesap');

    await signInViaUi(page, account);
    await page.goto('/settings/account');

    await page.getByRole('button', { name: 'Hesabı sil' }).click();
    const confirmButton = page.getByRole('button', { name: 'Kalıcı olarak sil' });
    await expect(confirmButton).toBeDisabled();

    await page.getByLabel('Şifre').fill(account.password);
    await expect(confirmButton).toBeDisabled();

    // Yanlış kullanıcı adı: uyarı çıkar, buton açılmaz.
    await page.getByLabel(`"${account.username}" yaz`).fill('yanlis');
    await expect(page.getByText('Kullanıcı adı eşleşmiyor.')).toBeVisible();
    await expect(confirmButton).toBeDisabled();

    await page.getByLabel(`"${account.username}" yaz`).fill(account.username);
    await expect(confirmButton).toBeEnabled();
  });

  test('hesap silinir ve oturum kapanir', async ({ page, api }) => {
    const account = await createAccount(api, 'hesap');

    await signInViaUi(page, account);
    await page.goto('/settings/account');

    await page.getByRole('button', { name: 'Hesabı sil' }).click();
    await page.getByLabel('Şifre').fill(account.password);
    await page.getByLabel(`"${account.username}" yaz`).fill(account.username);
    await page.getByRole('button', { name: 'Kalıcı olarak sil' }).click();

    await expect(page.getByText('Hesabın silindi')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);

    // Yerel oturum temizlendi: ayarlar artık login'e yönlendiriyor.
    await page.goto('/settings/account');
    await expect(page).toHaveURL(/\/login\?redirect=/);

    // Sunucu tarafında da silindi.
    const res = await api.get(`${API}/users/${account.username}`);
    expect(res.status()).toBe(404);

    const login = await api.post(`${API}/auth/login`, {
      data: { email: account.email, password: account.password },
    });
    expect(login.status()).toBe(401);
  });

  test('yanlis sifre ile hesap silinmez', async ({ page, api }) => {
    const account = await createAccount(api, 'hesap');

    await signInViaUi(page, account);
    await page.goto('/settings/account');

    await page.getByRole('button', { name: 'Hesabı sil' }).click();
    await page.getByLabel('Şifre').fill('YanlisParola123!');
    await page.getByLabel(`"${account.username}" yaz`).fill(account.username);
    await page.getByRole('button', { name: 'Kalıcı olarak sil' }).click();

    await expect(page.getByText('Mevcut şifre hatalı')).toBeVisible();

    const res = await api.get(`${API}/users/${account.username}`);
    expect(res.status()).toBe(200);
  });

  test('api: onay metni eslesmezse silinmez', async ({ api }) => {
    const account = await createAccount(api, 'hesap');

    const res = await api.delete(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${account.token}` },
      data: { password: account.password, confirmText: 'yanlis' },
    });

    expect(res.status()).toBe(400);
    const after = await api.get(`${API}/users/${account.username}`);
    expect(after.status()).toBe(200);
  });

  test('api: govdesiz istek reddedilir', async ({ api }) => {
    const account = await createAccount(api, 'hesap');

    const res = await api.delete(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${account.token}` },
    });

    expect(res.status()).toBe(400);
    const after = await api.get(`${API}/users/${account.username}`);
    expect(after.status()).toBe(200);
  });
});
