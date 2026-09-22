# Topluluk Platformu — Proje Planı

> Bu dosya "hafıza" olarak kullanılır. Her geliştirme sonrası güncellenir.
> Nerede kaldığımızı buradan takip ederiz.

## 1. Kararlar (sprint öncesi)

- **Backend:** Node.js + TypeScript + Fastify + Drizzle ORM (PostgreSQL)
- **Frontend:** Vite + React + TypeScript + Tailwind v4 + TanStack Query
- **DB:** PostgreSQL (Docker, local); Redis (docker) → rate-limit, cache, Socket.IO adapter, trending
- **Mail:** Resend; **AI:** Anthropic (Claude); **Auth:** session-based (kendi auth), GitHub OAuth
- **Paket yöneticisi:** pnpm; monorepo (apps/web, apps/api, packages/shared, packages/config)
- **UI dili:** Türkçe; **Repo:** development branch default
- **GitHub:** her issue commit mesajında `#(issueId)` içerir
- **Test:** Vitest (unit+integration), Playwright (e2e), coverage yüksek hedef
- **Tasarım:** vercel.com + framer.com + linear.app sentezi, koyu/açık tema, mobil=SaaS-app (PWA-yi), design system (`components/**/index.tsx`)

## 2. Paylaşılan veri modeli (Drizzle)

| Tablo         | Açıklama |
|---------------|----------|
| users         | email, username, name, bio, avatar, siteUrl, passwordHash, role, isActive |
| user_tools    | kullanıcının kullandığı araçlar (cursor, claude, codex, figma…) |
| email_verifications | doğrulama token'ları (hash'li) |
| password_resets | sıfırlama token'ları (hash'li) |
| sessions      | opaque token (hash'li), expiresAt, revoke desteği |
| oauth_accounts | provider (github) bağlantıları |
| posts         | title?, content (≤10k), category (soru/fikir/yaptın/genel), isDraft, source(ai/human) |
| post_flags    | ai üretimi postları işaretleme bilgileri |
| post_images   | post görselleri (sıralamalı, aspect) |
| post_polls    | anket (option'lar, selective-vote) |
| poll_votes    | anket oyları |
| post_likes    | beğeniler (unique userId+postId) |
| bookmarks     | kaydetme |
| comments      | yorum / yanıt (parentId) |
| follows       | takip (followerId, followingId) |
| reports       | şikayet (hedef tip + id, durum) |
| projects      | kullanıcı projeleri (logo, cover'lar, buildWith, isOpenSource, githubUrl, launch) |
| project_images| proje logo + cover görselleri |
| launch_feedback | launchpad yorum / puan |
| topics        | konu etiketleri |
| notifications | bildirimler (tip, entity, readAt, payload) |
| notification_settings | kullanıcı bildirim tercihleri |
| ai_articles   | haftalık AI özet makaleleri (slug, content, week) |

## 3. Sprint planlaması (Milestone'lar)

- **S-0 Scaffolding:** monorepo, CI, docker-compose (pg+redis), design system temeli, ortak paketler
- **S-1 Auth:** register, login, email doğrulama, forgot/reset, session + revoke, GitHub OAuth
- **S-2 Post oluşturma:** editor (TipTap + code highlight), görsel yükleme, poll, kategoriler, draft yönetimi
- **S-3 Feed:** new/trending/following filtreler, infinite pagination, scroll koruması, lazy-load, detay sayfası
- **S-4 Profil:** portfolio, proje CRUD + buildWith + github showcase (contributions, pinned)
- **S-5 Launchpad:** launch akışı, feedback/puanlama, takip/takipten çık, şikayet
- **S-6 Bildirimler & Ayarlar:** WS (Socket.IO + Redis) real-time, toaster, ayarlar sayfaları
- **S-7 AI Haftalık:** cron + HN/Reddit tarama + Claude makale üretimi + ayrım (ai post badge)
- **S-8 Kalite:** PWA, a11y, e2e (Playwright), perf, SEO, mobil uyum

## 4. Ortamlar

- `development` → local; PostgreSQL+Redis Docker; `.env` → `.env.development` değerleri
- `production` → `.env.production`; gerçek credential kullanıcıdan tamamlanır
- Tüm credential kullanıcı tarafından eklenmemiş → placeholder + `credentials.example.txt`

## 5. Mimari notlar

- API: modular (modules/auth, posts, feed, users, projects, launchpad, notifications, ai, uploads)
- Feed trending hesaplama: Redis ZSET (beğeni/etkileşim hızı) — periyodik agrega
- Upload: dev'de disk (`uploads/`), prod S3-compatible (abstraction, file-type doğrulama, boyut limitleri: avatar ≤2MB, cover ≤5MB, proje logo 1:1 ≤5MB)
- WebSocket: Socket.IO + `@socket.io/redis-adapter`; bildirim event'leri, online durum
- Rate limit: Redis tabanlı
- Loglama: pino; doğrulama: zod (shared package)
- Görüntü: proaktif `/health`, structured error handling, API docs (scalar/openapi)

## 6. Test stratejisi

- unit: service + schema mantığı (vitest)
- integration: API + DB (testcontainers/postgres veya docker flyway) — supertest
- e2e: Playwright (auth akışı, feed, post oluşturma, profil, launchpad)
- CI: GitHub Actions — lint, typecheck, test, build

## 7. Nerede kaldık (ilerleme günlüğü)

> Güncellenecek. Her tamamlanan issue buraya `#id ✔` eklenir.

- [ ] S-0 başlandı — repo init, plan
## 2026-09-22 � Durum (S-0 tamamland�, smoke test ge�ti)
- Ortam: Docker (pg 5433 / redis 6380, b2b �ak��mas� nedeniyle portlar de�i�ti), migration uyguland�.
- D�zeltilen hatalar:
  1. esbuild default-param TDZ: `constructor(private readonly db: DB = db)` -> `(db: DB)` + `new XxxService(db)` (7 servise).
  2. zod v4: `.partial()` refinement i�eren schema'da �al��m�yor -> `z.object(shape).partial()`.
  3. @fastify/multipart 8 -> 9 (Fastify 5).
  4. Session imzas� `hash(rawToken)` �zerindeydi ama ham token istemciye verilmiyordu -> `hash(sessionId)` �zerine kuruldu; vermede expiresAt kontrol� eklendi.
  5. Feed/listDrafts `Promise.all` eksikti (map async d�n�yordu).
- Do�rulanan u�lar: register, login, session guard, post olu�turma, feed (cursor), post detay, like, bookmark, yorum (olu�tur/iste), proje olu�turma, profil, auth/me, notifications/unread-count.
- Blokeler: gh auth yok (GitHub repo/issue kurulamad�), Resend/Anthropic/GitHub OAuth key'leri placeholder (.env'e girilmedi).
- S�radaki: web frontend (main.tsx, router, api client, auth store, app shell, feed + editor), sonra GitHub repo + issue'lar.
