import { expect, test, createAccount, signInViaUi, uniqueUsername, E2E_PASSWORD } from './fixtures';

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

  test('kayit ol -> feed sayfasina yonlendirir ve oturum kurar', async ({ page }) => {
    const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
    const username = `e2e_${stamp}`.slice(0, 30);

    await page.goto('/register');
    await page.locator('input[name="name"]').fill('E2E Kullanici');
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="email"]').fill(`${username}@e2e.local`);
    await page.locator('input[name="password"]').fill('E2eParola123!');
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/feed$/);

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

  test('sifre sifirlama linki gonderir ve tekrar gonderme sayacini baslatir', async ({ page, api }) => {
    const account = await createAccount(api);

    await page.goto('/forgot-password');
    await page.locator('input[name="email"]').fill(account.email);
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText('Sıfırlama linkini e-posta adresine gönderdik')).toBeVisible();
    // Tekrar gonderme butonu bekleme sayacina girmeli.
    await expect(page.getByRole('button', { name: /sonra tekrar dene/ })).toBeVisible();
  });

  test('sifre sifirlama linki olmadan uyari gosterir', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByText('Sıfırlama linki geçersiz veya eksik.')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveCount(0);
  });

  test('e-posta dogrulama linki olmadan uyari gosterir', async ({ page }) => {
    await page.goto('/verify-email');

    await expect(page.getByText('Doğrulama linki geçersiz.')).toBeVisible();
  });

  test('e-posta dogrulama linki gecersiz token ile hata gosterir', async ({ page }) => {
    // Gercek token e-postayla gonderiliyor ve DB'de hashli saklandigi icin
    // mutlu yol API unit testinde, burada yalnizca hata yolu dogrulanir.
    await page.goto('/verify-email?token=gecersiz-token');

    await expect(page.getByText('Geçersiz veya kullanılmış doğrulama kodu')).toBeVisible();
    // Basari durumundaki "Giris yap" cagrisi olmamali (Header'daki link haric).
    await expect(page.getByRole('main').getByRole('link', { name: 'Giriş yap' })).toHaveCount(0);
  });

  test('api: limit asimi 429 RATE_LIMITED doner', async ({ api }) => {
    // verify-email ucunda 10/dk limiti var; limitin dondugu anlatilir.
    // Once hata durumunda status 400 oldugu icin sayac burada tuketiliyor.
    let limited = 0;
    let lastStatus = 0;
    let lastCode = '';

    for (let i = 0; i < 14; i += 1) {
      const res = await api.post('/api/auth/verify-email', { data: { token: `gecersiz-token-${i}` } });
      lastStatus = res.status();
      if (lastStatus === 429) {
        limited += 1;
        lastCode = ((await res.json()) as { error?: { code?: string } }).error?.code ?? '';
        break;
      }
    }

    expect(lastStatus).toBe(429);
    expect(lastCode).toBe('RATE_LIMITED');
    expect(limited).toBe(1);
  });

  test('login redirect parametresi ile istenen sayfaya doner', async ({ page, api }) => {
    const account = await createAccount(api);

    // Korumali sayfaya gidin: giris paneli gorunmeli.
    await page.goto('/post/yeni');
    await expect(page.getByRole('heading', { name: 'Giriş gerekli' })).toBeVisible();

    // Header'da da "Giriş yap" var; yalnizca sayfa ici olani secilir.
    await page.getByRole('main').getByRole('link', { name: 'Giriş yap' }).click();
    await expect(page).toHaveURL(/\/login\?redirect=%2Fpost%2Fyeni$/);

    await page.locator('input[name="email"]').fill(account.email);
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/post\/yeni$/);
    await expect(page.getByRole('heading', { name: 'Yeni post' })).toBeVisible();
  });

  test('login redirect dis linke yonlendirmez', async ({ page, api }) => {
    const account = await createAccount(api);

    // "//evil.com" open redirect'e donusmemeli, feed'e dusmeli.
    await page.goto('/login?redirect=//evil.com');
    await page.locator('input[name="email"]').fill(account.email);
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/feed$/);
  });

  test('kayit ol sonrasi redirect parametresi kullanilir', async ({ page }) => {
    const username = uniqueUsername('e2e');

    await page.goto('/register?redirect=/taslaklar');
    await page.locator('input[name="name"]').fill('E2E Kullanici');
    await page.locator('input[name="username"]').fill(username);
    await page.locator('input[name="email"]').fill(`${username}@e2e.local`);
    await page.locator('input[name="password"]').fill(E2E_PASSWORD);
    await page.locator('button[type="submit"]').click();

    await expect(page).toHaveURL(/\/taslaklar$/);
  });
});

test.describe('oturum yonetimi', () => {
  test('oturumsuz kullanici guvenlik sayfasindan login e yonlendirilir', async ({ page }) => {
    await page.goto('/settings/security');

    await expect(page).toHaveURL(/\/login\?redirect=/);
    await expect(page.getByText('Aktif oturumlar')).toHaveCount(0);
  });

  test('aktif oturum listelenir ve bu cihaz isaretlidir', async ({ page, api }) => {
    const account = await createAccount(api);

    await signInViaUi(page, account);
    await page.goto('/settings/security');

    // createAccount da bir oturum actigi icin kayit + tarayici = 2 oturum.
    await expect(page.getByRole('heading', { name: 'Aktif oturumlar (2)' })).toBeVisible();
    // Rozet metni ("bu cihaz açık kalır" açıklamasıyla karışmasın diye exact).
    await expect(page.getByText('Bu cihaz', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Diğerlerini kapat' })).toBeEnabled();
  });

  test('tek oturum kaldiginda toplu kapatma butonu kapali olur', async ({ page, api }) => {
    const account = await createAccount(api);

    await signInViaUi(page, account);
    await page.goto('/settings/security');
    await page.getByRole('button', { name: 'Diğerlerini kapat' }).click();
    await expect(page.getByRole('heading', { name: 'Aktif oturumlar (1)' })).toBeVisible();

    await expect(page.getByRole('button', { name: 'Diğerlerini kapat' })).toBeDisabled();
  });

  test('cikis yap oturumu sunucu tarafinda kapatir', async ({ page, api }) => {
    const account = await createAccount(api);

    await signInViaUi(page, account);
    // Tarayici oturumunun tokeni (kayit oturumu degil).
    const browserToken = await page.evaluate(() => {
      const raw = localStorage.getItem('community.auth');
      return raw ? (JSON.parse(raw).token as string) : null;
    });
    expect(browserToken).toBeTruthy();

    await page.getByRole('button', { name: 'Çıkış yap' }).click();
    await expect(page.getByText('Çıkış yapıldı')).toBeVisible();
    await expect(page).toHaveURL(/\/feed$/);

    // localStorage temizlenmeli.
    const stored = await page.evaluate(() => localStorage.getItem('community.auth'));
    expect(stored).toBeNull();

    // Kapatilan oturum sunucuda da gecersiz olmali.
    const res = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${browserToken}` } });
    expect(res.status()).toBe(401);
  });

  test('diger oturumlar tek tek kapatilabilir', async ({ page, api }) => {
    const account = await createAccount(api);
    // Ayni hesapla ikinci bir oturum ac (API'den, tarayiciyi degistirmeden).
    const second = await api.post('/api/auth/login', {
      data: { email: account.email, password: E2E_PASSWORD },
    });
    expect(second.status()).toBe(200);
    const secondToken = ((await second.json()) as { token: string }).token;
    expect(secondToken).not.toBe(account.token);

    await signInViaUi(page, account);
    await page.goto('/settings/security');
    await expect(page.getByRole('heading', { name: 'Aktif oturumlar (3)' })).toBeVisible();

    // "Diğerlerini kapat" da "Kapat" ile eslesmesin diye exact: true.
    await page.getByRole('button', { name: 'Kapat', exact: true }).first().click();

    await expect(page.getByRole('heading', { name: 'Aktif oturumlar (2)' })).toBeVisible();
    const res = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${secondToken}` } });
    expect(res.status()).toBe(401);
  });

  test('digerlerini kapat butonu kalan oturumlari kapatir', async ({ page, api }) => {
    const account = await createAccount(api);
    const second = await api.post('/api/auth/login', {
      data: { email: account.email, password: E2E_PASSWORD },
    });
    expect(second.status()).toBe(200);
    const secondToken = ((await second.json()) as { token: string }).token;

    await signInViaUi(page, account);
    const browserToken = await page.evaluate(() => {
      const raw = localStorage.getItem('community.auth');
      return raw ? (JSON.parse(raw).token as string) : null;
    });
    await page.goto('/settings/security');
    await expect(page.getByRole('heading', { name: 'Aktif oturumlar (3)' })).toBeVisible();

    await page.getByRole('button', { name: 'Diğerlerini kapat', exact: true }).click();

    // Yalnizca tarayici oturumu ayakta kalir.
    await expect(page.getByRole('heading', { name: 'Aktif oturumlar (1)' })).toBeVisible();
    const mine = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${browserToken}` } });
    expect(mine.status()).toBe(200);
    const register = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${account.token}` } });
    expect(register.status()).toBe(401);
    const other = await api.get('/api/auth/me', { headers: { Authorization: `Bearer ${secondToken}` } });
    expect(other.status()).toBe(401);
  });
});
