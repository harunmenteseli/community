import { createAccount, expect, signInViaUi, test } from './fixtures';

async function createLaunchedProject(
  api: import('@playwright/test').APIRequestContext,
  prefix: string,
  fields: { name: string; category?: string; buildWith?: string[]; description?: string } = {
    name: 'Vitrini Kaydi',
  },
) {
  const account = await createAccount(api, prefix);
  const slug = fields.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const created = await api.post('/api/projects', {
    headers: { Authorization: `Bearer ${account.token}` },
    data: {
      name: fields.name,
      url: `https://example.com/${slug}`,
      category: fields.category ?? 'web',
      buildWith: fields.buildWith ?? ['React'],
      description: fields.description ?? 'Vitrin icin aciklama',
      launched: true,
    },
  });
  expect(created.status()).toBe(201);
  const body = (await created.json()) as { project: { id: string } };
  return { account, projectId: body.project.id, url: `https://example.com/${slug}` };
}

/** Ortak veritabaninda tek bir karti kapsamak icin yardimci. */
function card(page: import('@playwright/test').Page, name: string) {
  return page.getByRole('listitem').filter({ has: page.getByRole('heading', { name, level: 2 }) });
}

/**
 * Veritabani testler arasi paylasildigi icin ayni proje adi birden fazla kez
 * olusabilir; kartlari ayirt etmek icin isimlere benzersiz son ek eklenir.
 */
function uniqueName(label: string): string {
  return `${label} ${Math.random().toString(36).slice(2, 7)}`;
}

test.describe('kariyer vitrini akisi', () => {
  test('yayinlanan kayitlar gorunur, taslaklar gorunmez', async ({ page, api }) => {
    const publishedName = uniqueName('Yayindaki Is');
    const draftName = uniqueName('Taslak Is');
    const launched = await createLaunchedProject(api, 'vitrini', { name: publishedName, description: 'Yayinda olan proje' });
    const draft = await createLaunchedProject(api, 'vitrini', { name: draftName });
    await api.post(`/api/launchpad/${draft.projectId}/unlaunch`, {
      headers: { Authorization: `Bearer ${draft.account.token}` },
    });

    await page.goto('/kariyer-vitrini');

    await expect(page.getByRole('heading', { name: 'Kariyer Vitrini', level: 1 })).toBeVisible();
    await expect(page.getByRole('heading', { name: draftName, level: 2 })).toHaveCount(0);

    const published = card(page, publishedName);
    await expect(published).toBeVisible();
    await expect(published.getByText('Yayinda olan proje')).toBeVisible();
    await expect(published.getByLabel('Kullanilan teknolojiler').getByText('React')).toBeVisible();
    await expect(published.getByRole('link', { name: 'Projeyi aç' })).toHaveAttribute('href', launched.url);
// Puan verilmeden once ortalama 0.0
    await expect(published.getByLabel('Ortalama puan 0 / 10')).toBeVisible();
    // Yazar linki sahibin profiline gider
    await expect(published.getByRole('link', { name: 'E2E Kullanici' })).toHaveAttribute(
      'href',
      `/u/${launched.account.username}`,
    );
  });

  test('yeni ve populer siralamasi', async ({ page, api }) => {
    // Once olusturulan, sonra yuksek puan alan kayit: "yeni"de ikinci sirada,
    // "populer"de birinci olmali.
    const highName = uniqueName('Yuksek Puanli Eski');
    const lowName = uniqueName('Dusuk Puanli Yeni');
    const high = await createLaunchedProject(api, 'vitrini', { name: highName });
    await createLaunchedProject(api, 'vitrini', { name: lowName });
    await api.post(`/api/launchpad/${high.projectId}/feedback`, {
      headers: { Authorization: `Bearer ${(await createAccount(api, 'rater')).token}` },
      data: { rating: 10, comment: 'Harika is' },
    });

    await page.goto('/kariyer-vitrini');

    await page.getByRole('tab', { name: 'Popüler' }).click();
    await expect(card(page, highName)).toBeVisible();
    await expect(card(page, highName).getByLabel('Ortalama puan 10 / 10')).toBeVisible();

    await page.getByRole('tab', { name: 'Yeni' }).click();
    await expect(card(page, lowName)).toBeVisible();
    const firstCard = page.getByRole('listitem').filter({ has: page.getByRole('heading', { level: 2 }) }).first();
    await expect(firstCard).toContainText(lowName);
  });

test('yorum ve puan verilir, ortalama guncellenir', async ({ page, api }) => {
    const targetName = uniqueName('Puanlanacak Is');
    const { account: owner, projectId } = await createLaunchedProject(api, 'vitrini', { name: targetName });
    const rater = await createAccount(api, 'rater');

    await signInViaUi(page, rater);
    await page.goto('/kariyer-vitrini');

    const target = card(page, targetName);
    await target.getByRole('button', { name: 'Yorum & Puan' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'Yorum & Puan' })).toBeVisible();
    await expect(dialog.getByText('Henüz yorum yok.')).toBeVisible();

    await dialog.getByRole('radio', { name: '8 puan' }).click();
    await dialog.getByRole('textbox', { name: 'Yorum' }).fill('Cok islevsel bir proje');
    await dialog.getByRole('button', { name: 'Gönder' }).click();

    await expect(page.getByText('Yorumun gönderildi')).toBeVisible();
    await expect(target.getByLabel('Ortalama puan 8 / 10')).toBeVisible();
    await expect(target.getByLabel('Ortalama puan 8 / 10')).toContainText('(1)');

// API: puanlayan kullanici kendi feedback'ini gorur, sahibin feedback'i yoktur
    const detail = await api.get(`/api/launchpad/${projectId}`, {
      headers: { Authorization: `Bearer ${rater.token}` },
    });
    const body = (await detail.json()) as {
      project: { avgRating: number; ratingCount: number };
      feedback: { rating: number; comment: string }[];
      myFeedback: { rating: number } | null;
    };
    expect(body.project.avgRating).toBe(8);
    expect(body.project.ratingCount).toBe(1);
    expect(body.feedback[0]?.comment).toBe('Cok islevsel bir proje');
    expect(body.myFeedback?.rating).toBe(8);

    const asOwner = await api.get(`/api/launchpad/${projectId}`, {
      headers: { Authorization: `Bearer ${owner.token}` },
    });
    const ownerBody = (await asOwner.json()) as { myFeedback: unknown };
    expect(ownerBody.myFeedback).toBeNull();

// Puan guncellemesi yeni kayit degil, mevcut feedback'i gunceller
    await target.getByRole('button', { name: 'Yorum & Puan' }).click();
const reopened = page.getByRole('dialog');
    await expect(reopened.getByText('Önceki puanın:')).toBeVisible();
    // Form mevcut feedback ile doldurulur ve yorum listede gorunur
    await expect(reopened.getByRole('textbox', { name: 'Yorum' })).toHaveValue('Cok islevsel bir proje');
    await expect(reopened.getByRole('listitem')).toContainText('Cok islevsel bir proje');
await reopened.getByRole('radio', { name: '3 puan' }).click();
    await expect(reopened.getByRole('radio', { name: '3 puan' })).toHaveAttribute('aria-checked', 'true');
    await reopened.getByRole('button', { name: 'Gönder' }).click();

    // Toast'a bakarak ilerlemiyoruz: eski toast hâlâ ekrandayken yeni istek
    // commit olmamis olabilir. Kart uzerindeki ortalama, yalnizca istek bittikten
    // sonra guncellendigi icin dogru senkronizasyon noktasi o.
    await expect(target.getByLabel('Ortalama puan 3 / 10')).toBeVisible();
    await expect(target.getByLabel('Ortalama puan 3 / 10')).toContainText('(1)');

    const after = await api.get(`/api/launchpad/${projectId}`);
    const afterBody = (await after.json()) as { project: { avgRating: number; ratingCount: number } };
    expect(afterBody.project.avgRating).toBe(3);
    expect(afterBody.project.ratingCount).toBe(1);
  });

  test('oturumsuz kullanici yorumlama yapamaz', async ({ page }) => {
    await page.goto('/kariyer-vitrini');
    await expect(page.getByRole('heading', { name: 'Kariyer Vitrini', level: 1 })).toBeVisible();
    // Giriş yapilmadigi icin kartlarin "Yorum & Puan" butonu acilir ama
    // modalda giris uyarisi gorunur.
    const anyButton = page.getByRole('button', { name: 'Yorum & Puan' }).first();
    if (await anyButton.count()) {
      await anyButton.click();
      await expect(page.getByRole('dialog').getByText('giriş yapmalısın')).toBeVisible();
    }
  });

  test('sahibi kaydi vitrinden kaldirip geri ekleyebilir', async ({ page, api }) => {
    const ownerName = uniqueName('Sahibin Isi');
    const { account, projectId } = await createLaunchedProject(api, 'vitrini', { name: ownerName });

    await signInViaUi(page, account);
    await page.goto('/kariyer-vitrini');

    await expect(card(page, ownerName)).toBeVisible();
    const unlaunch = card(page, ownerName).getByRole('button', { name: 'Vitrinden kaldır' });
    await unlaunch.scrollIntoViewIfNeeded();
    await unlaunch.click();
    await expect(page.getByText('Yayin durumu guncellendi')).toBeVisible();
    await expect(page.getByRole('heading', { name: ownerName, level: 2 })).toHaveCount(0);

    await page.goto('/vitrin');
    await page.getByRole('link', { name: ownerName + ' kaydını düzenle' }).click();
    await page.getByText('Yayında').click();
    await page.getByRole('button', { name: 'Kaydet' }).click();
    await expect(page.getByText('Vitrin kaydı güncellendi')).toBeVisible();

    await page.goto('/kariyer-vitrini');
    await expect(card(page, ownerName)).toBeVisible();

    const detail = await api.get(`/api/launchpad/${projectId}`);
    expect(detail.status()).toBe(200);
  });

  test('api: gecersiz puan ve oy sahibi disi kurallar', async ({ api }) => {
    const { account: owner, projectId } = await createLaunchedProject(api, 'vitrini', { name: 'Kural Projesi' });
    const other = await createAccount(api, 'rater');

    const zero = await api.post(`/api/launchpad/${projectId}/feedback`, {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { rating: 0 },
    });
    expect(zero.status()).toBe(400);

    const eleven = await api.post(`/api/launchpad/${projectId}/feedback`, {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { rating: 11 },
    });
    expect(eleven.status()).toBe(400);

    const anon = await api.post(`/api/launchpad/${projectId}/feedback`, { data: { rating: 5 } });
    expect(anon.status()).toBe(401);

    // Kendi projesine puan veremez
    const self = await api.post(`/api/launchpad/${projectId}/feedback`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: { rating: 5 },
    });
    expect(self.status()).toBe(400);

    // Olmayan proje
    const missing = await api.post('/api/launchpad/00000000-0000-0000-0000-000000000000/feedback', {
      headers: { Authorization: `Bearer ${other.token}` },
      data: { rating: 5 },
    });
    expect(missing.status()).toBe(404);
  });

  // Testler ayni veritabanini paylasir; bu yuzden mutlak kayit sayisina degil,
  // cursor'un ilk sayfayi TEKRARLAMADIGINA bakiliyor (daha once 'yeni' siralamasi
  // cursor'u hic yok sayiyordu).
  test('api: sayfalama cursoru ikinci sayfayi getirir', async ({ api }) => {
    for (const sort of ['yeni', 'puan'] as const) {
      for (let i = 0; i < 3; i += 1) {
        await createLaunchedProject(api, 'page', { name: `${uniqueName(`Sayfa ${sort}`)} ${i}` });
      }

      const first = await api.get(`/api/launchpad?limit=2&sort=${sort}`);
      expect(first.status()).toBe(200);
      const firstBody = (await first.json()) as {
        projects: { id: string }[];
        nextCursor: string | null;
      };
      expect(firstBody.projects).toHaveLength(2);
      expect(firstBody.nextCursor).toBe('2');

      const second = await api.get(`/api/launchpad?limit=2&sort=${sort}&cursor=2`);
      const secondBody = (await second.json()) as {
        projects: { id: string }[];
        nextCursor: string | null;
      };
      expect(secondBody.projects).toHaveLength(2);

const firstIds = firstBody.projects.map((p) => p.id);
      const secondIds = secondBody.projects.map((p) => p.id);
      expect(secondIds.filter((id) => firstIds.includes(id))).toEqual([]);

      // Sayfalama sonunda durur ve hicbir kayit tekrarlanmaz.
      const seen = new Set<string>([...firstIds, ...secondIds]);
      let cursor: string | null = secondBody.nextCursor;
      for (let page = 0; page < 200 && cursor; page += 1) {
        const res = await api.get(`/api/launchpad?limit=30&sort=${sort}&cursor=${cursor}`);
        const body = (await res.json()) as { projects: { id: string }[]; nextCursor: string | null };
        for (const project of body.projects) {
          expect(seen.has(project.id)).toBe(false);
          seen.add(project.id);
        }
        cursor = body.nextCursor;
      }
      expect(cursor).toBeNull();
    }
  });

  test('api: gecersiz cursor ilk sayfaya duser', async ({ api }) => {
    await createLaunchedProject(api, 'page', { name: uniqueName('Gecersiz Cursor') });

    const baseline = await api.get('/api/launchpad?limit=5&sort=yeni');
    const baselineBody = (await baseline.json()) as { projects: { id: string }[] };

    const bogus = await api.get('/api/launchpad?limit=5&sort=yeni&cursor=abc');
    const bogusBody = (await bogus.json()) as { projects: { id: string }[] };

    expect(bogus.status()).toBe(200);
    expect(bogusBody.projects.map((p) => p.id)).toEqual(baselineBody.projects.map((p) => p.id));
  });
});
