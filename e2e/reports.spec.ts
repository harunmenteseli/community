import { createAccount, createAdmin, expect, signInViaUi, test } from './fixtures';

interface TestPost {
  author: { token: string; username: string };
  postId: string;
  title: string;
}

async function createPost(
  api: import('@playwright/test').APIRequestContext,
  label: string,
): Promise<TestPost> {
  const account = await createAccount(api, 'author');
  const title = `${label} ${Math.random().toString(36).slice(2, 7)}`;
  const created = await api.post('/api/posts', {
    headers: { Authorization: `Bearer ${account.token}` },
    data: { title, content: 'Sikayet edilebilir icerik.', category: 'soru' },
  });
  expect(created.status(), await created.text()).toBe(201);
  const body = (await created.json()) as { post: { id: string } };
  return { author: { token: account.token, username: account.username }, postId: body.post.id, title };
}

async function createLaunchedProject(api: import('@playwright/test').APIRequestContext, label: string) {
  const account = await createAccount(api, 'owner');
  const name = `${label} ${Math.random().toString(36).slice(2, 7)}`;
  const created = await api.post('/api/projects', {
    headers: { Authorization: `Bearer ${account.token}` },
    data: {
      name,
      url: `https://example.com/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      category: 'web',
      buildWith: ['React'],
      description: 'Sikayet edilebilir vitrin kaydi',
      launched: true,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const body = (await created.json()) as { project: { id: string } };
  return { projectId: body.project.id, name };
}

test.describe('sikayet akisi', () => {
  test('post icin sikayet gonderilir ve kaydedilir', async ({ page, api }) => {
    const post = await createPost(api, 'Sikayet Edilecek Gonderi');
    const reporter = await createAccount(api, 'reporter');
    await signInViaUi(page, reporter);

    await page.goto(`/post/${post.postId}`);
    await page.getByRole('button', { name: `Şikayet et: ${post.title}` }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText(`Gönderi: ${post.title}`)).toBeVisible();

    // Sebep secilmeden gonderilemez.
    await dialog.getByRole('button', { name: 'Gönder' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Bir sebep seç');

    // "Diger" secimi aciklama istiyor.
    await dialog.getByRole('radio', { name: 'Diğer' }).check();
    await dialog.getByRole('button', { name: 'Gönder' }).click();
    await expect(dialog.getByRole('alert')).toHaveText('"Diğer" için açıklama yaz');

    await dialog.getByLabel('Açıklama').fill('Bot gibi davranıyor ve spam yapıyor.');
    await dialog.getByRole('button', { name: 'Gönder' }).click();
    await expect(dialog).toBeHidden();

    const mine = await api.get('/api/reports/mine', {
      headers: { Authorization: `Bearer ${reporter.token}` },
    });
    expect(mine.status()).toBe(200);
    const body = (await mine.json()) as {
      reports: { targetType: string; status: string; reason: string }[];
    };
    const created = body.reports.find((report) => report.targetType === 'post');
    expect(created).toMatchObject({ targetType: 'post', status: 'pending', reason: 'other' });
  });

  test('ayni hedef icin ikinci sikayet reddedilir', async ({ page, api }) => {
    const post = await createPost(api, 'Cift Sikayet Gonderisi');
    const reporter = await createAccount(api, 'reporter');

    const first = await api.post('/api/reports', {
      headers: { Authorization: `Bearer ${reporter.token}` },
      data: { targetType: 'post', targetId: post.postId, reason: 'spam' },
    });
    expect(first.status(), await first.text()).toBe(201);

    const second = await api.post('/api/reports', {
      headers: { Authorization: `Bearer ${reporter.token}` },
      data: { targetType: 'post', targetId: post.postId, reason: 'abuse' },
    });
    expect(second.status()).toBe(409);
  });

  test('vitrin kaydi icin sikayet gonderilir', async ({ page, api }) => {
    const project = await createLaunchedProject(api, 'Sikayet Edilecek Kayit');
    const reporter = await createAccount(api, 'reporter');
    await signInViaUi(page, reporter);

    await page.goto('/kariyer-vitrini');
    const card = page.getByRole('listitem').filter({
      has: page.getByRole('heading', { name: project.name, level: 2 }),
    });
    await card.getByRole('button', { name: `Şikayet et: ${project.name}` }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: 'Uygunsuz içerik' }).check();
    await dialog.getByRole('button', { name: 'Gönder' }).click();
    await expect(dialog).toBeHidden();

    const mine = await api.get('/api/reports/mine', {
      headers: { Authorization: `Bearer ${reporter.token}` },
    });
    const body = (await mine.json()) as { reports: { targetType: string; status: string }[] };
    expect(body.reports.some((report) => report.targetType === 'project')).toBe(true);
  });

  test('oturumsuz kullanici gonderiye sikayet edemez', async ({ page, api }) => {
    const post = await createPost(api, 'Anonim Sikayet Gonderisi');

    await page.goto(`/post/${post.postId}`);
    await page.getByRole('button', { name: `Şikayet et: ${post.title}` }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Şikâyet bildirmek için giriş yapmalısın.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Gönder' })).toHaveCount(0);
  });

  test('kendi profilinde sikayet butonu gorunmez', async ({ page, api }) => {
    const account = await createAccount(api, 'selfreport');
    await signInViaUi(page, account);

    await page.goto(`/u/${account.username}`);
    await expect(page.getByRole('button', { name: `Şikayet et: ${account.username}` })).toHaveCount(0);
  });

  test('api dogrulamalari: gecersiz hedef, gecersiz sebep, oturumsuz', async ({ api }) => {
    const reporter = await createAccount(api, 'reporter');
    const post = await createPost(api, 'Dogrulama Gonderisi');
    const headers = { Authorization: `Bearer ${reporter.token}` };

    const anonymous = await api.post('/api/reports', {
      data: { targetType: 'post', targetId: post.postId, reason: 'spam' },
    });
    expect(anonymous.status()).toBe(401);

    const badTarget = await api.post('/api/reports', {
      headers,
      data: { targetType: 'yorum', targetId: post.postId, reason: 'spam' },
    });
    expect(badTarget.status()).toBe(400);

    const badReason = await api.post('/api/reports', {
      headers,
      data: { targetType: 'post', targetId: post.postId, reason: 'kibel' },
    });
    expect(badReason.status()).toBe(400);

    const missing = await api.post('/api/reports', {
      headers,
      data: {
        targetType: 'post',
        targetId: '11111111-2222-4333-8444-555555555555',
        reason: 'spam',
      },
    });
    expect(missing.status()).toBe(404);

    const selfReport = await api.post('/api/reports', {
      headers,
      data: { targetType: 'user', targetId: '11111111-2222-4333-8444-555555555555', reason: 'spam' },
    });
    expect(selfReport.status()).toBe(404);

    const profile = (await (
      await api.get(`/api/users/${reporter.username}`, { headers })
    ).json()) as { user: { id: string } };
    const ownProfile = await api.post('/api/reports', {
      headers,
      data: { targetType: 'user', targetId: profile.user.id, reason: 'spam' },
    });
    expect(ownProfile.status()).toBe(400);
  });

  test('yonetici sonucu raporlayana bildirim olarak gider', async ({ api }) => {
    const post = await createPost(api, 'Moderasyon Gonderisi');
    const reporter = await createAccount(api, 'reporter');

    const created = await api.post('/api/reports', {
      headers: { Authorization: `Bearer ${reporter.token}` },
      data: { targetType: 'post', targetId: post.postId, reason: 'scam', message: 'Dolandirici link var.' },
    });
    expect(created.status(), await created.text()).toBe(201);
    const body = (await created.json()) as { report: { id: string } };

    // Normal kullanici sonuclandiramiyor.
    const forbidden = await api.post(`/api/reports/${body.report.id}/resolve`, {
      headers: { Authorization: `Bearer ${reporter.token}` },
      data: { status: 'approved' },
    });
    expect(forbidden.status()).toBe(403);

    const admin = await createAdmin(api);
    const resolved = await api.post(`/api/reports/${body.report.id}/resolve`, {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { status: 'approved' },
    });
    expect(resolved.status(), await resolved.text()).toBe(200);

    const twice = await api.post(`/api/reports/${body.report.id}/resolve`, {
      headers: { Authorization: `Bearer ${admin.token}` },
      data: { status: 'rejected' },
    });
    expect(twice.status()).toBe(409);

    // S-6: sonuc, raporlayan kullanicinin bildirim kutusuna düşer.
    const notifications = await api.get('/api/notifications', {
      headers: { Authorization: `Bearer ${reporter.token}` },
    });
    expect(notifications.status()).toBe(200);
    const list = (await notifications.json()) as {
      items: { type: string; entityId: string | null }[];
    };
    const update = list.items.find(
      (notification) => notification.type === 'reportUpdate' && notification.entityId === body.report.id,
    );
    expect(update).toBeTruthy();
  });
});
