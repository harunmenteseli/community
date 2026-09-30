import { expect, test as base, type APIRequestContext } from '@playwright/test';

const API_PORT = process.env.E2E_API_PORT ?? '4311';
const API_URL = process.env.E2E_API_URL ?? `http://127.0.0.1:${API_PORT}`;

export const test = base.extend<{ api: APIRequestContext }>({
  // API dogrudan API portundan cagrilir: /health ucu /api oneki olmadan sunuluyor
  // ve web proxy'si yalnizca /api, /uploads ve /socket.io yollarini yonlendiriyor.
  api: async ({ playwright }, use) => {
    const api = await playwright.request.newContext({
      baseURL: API_URL,
      extraHTTPHeaders: { Accept: 'application/json' },
    });
    await use(api);
    await api.dispose();
  },
});

export { expect };

/**
 * Profil istatistik degerini deterministik sekilde okur.
 * Stat markup'i `<div><dt>Etiket</dt><dd>Deger</dd></div>` seklinde; eski
 * `getByText('Vitrin').locator('..')` yazimi kullanici adi ya da "tarihinden
 * beri uye" metnine denk gelip yanlis geciyordu.
 */
export function profileStat(page: import('@playwright/test').Page, label: string) {
  return page.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::dd[1]');
}

export const E2E_PASSWORD = 'E2eParola123!';

export function uniqueUsername(prefix = 'e2e'): string {
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
  return `${prefix}_${stamp}`.slice(0, 30);
}

export interface TestAccount {
  username: string;
  email: string;
  password: string;
  token: string;
}

/**
 * Testler ayni veritabanini paylasir. Kullanici adini benzersiz uretip API uzerinden
 * kaydeder, boylece art arda calistirilmalarda cakisma olmaz ve tarayiciya sadece
 * giris bilgileri doldurulur.
 */
export async function createAccount(
  api: APIRequestContext,
  prefix = 'e2e',
): Promise<TestAccount> {
  const username = uniqueUsername(prefix);
  const email = `${username}@e2e.local`;
  const password = E2E_PASSWORD;

  const res = await api.post('/api/auth/register', {
    data: { email, password, name: 'E2E Kullanici', username },
  });

  expect(res.status(), await res.text()).toBe(201);

  const body = await res.json();
  return { username, email, password, token: body.token as string };
}

/** Sayfada oturum acmadan once uygulamanin localStorage alanini doldurur. */
export async function signInViaUi(page: import('@playwright/test').Page, account: TestAccount): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}
