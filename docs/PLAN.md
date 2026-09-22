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

- [x] S-0 tamamlandı — repo init, monorepo, API çekirdeği, design system temeli, smoke test

## 2026-09-22 — Durum (S-0 tamamlandı, smoke test geçti)

- Ortam: Docker (pg 5433 / redis 6380, b2b çakışması nedeniyle portlar değişti), migration uygulandı.
- Düzeltilen hatalar:
  1. esbuild default-param TDZ: `constructor(private readonly db: DB = db)` -> `(db: DB)` + `new XxxService(db)` (7 servise).
  2. zod v4: `.partial()` refinement içeren schema'da çalışmıyor -> `z.object(shape).partial()`.
  3. @fastify/multipart 8 -> 9 (Fastify 5).
  4. Session imzası `hash(rawToken)` üzerindeydi ama ham token istemciye verilmiyordu -> `hash(sessionId)` üzerine kuruldu; vermede expiresAt kontrolü eklendi.
  5. Feed/listDrafts `Promise.all` eksikti (map async dönüyordu).
- Doğrulanan uçlar: register, login, session guard, post oluşturma, feed (cursor), post detay, like, bookmark, yorum (oluştur/iste), proje oluşturma, profil, auth/me, notifications/unread-count.
- GitHub: harunmenteseli/community (public), development default branch, ilk commit push edildi, 8 milestone (S-1..S-8) + 17 issue (**#1..#17**) oluşturuldu.
- Blokeler: Resend/Anthropic/GitHub OAuth key'leri placeholder (.env'e girilmedi).
- Sıradaki: web frontend (main.tsx, router, api client, auth store, app shell, feed + editor).

## 2026-09-23 — Durum (S-1 web auth akışı #1, typecheck+build+smoke geçti)

- Web uygulaması ilk olarak ayağa kaldırıldı: `main.tsx`, `index.html`, favicon, `<body>`/root, providers (QueryClient + sonner Toaster + tema init).
- TanStack Router v1 manuel route tree (`routes/router.ts`): `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `*` (404). Root layout + Header (auth durumuna göre giriş/kayıt vs avatar+çıkış) + Footer eklendi.
- Auth çekirdeği:
  - `lib/api.ts` — fetch wrapper + `ApiError` (API'nin Türkçe `message`'ını hataya taşır), token'ı localStorage okur.
  - `state/auth.ts` + `state/atoms.ts` — jotai atomları (authStateAtom, userAtom, setSessionAtom, clearSessionAtom), token `community.auth` anahtarında `{token, user}`.
  - `lib/validation.ts` — zod v4 + RHF için özel `zodResolver` (zod4 issue kodları → Türkçe mesajlar). @hookform/resolvers v3'ün zod4 desteği güvenilmez olduğu için elle yazıldı.
  - `features/auth/api.ts` — register/login/me/logout/verify-email/resend-verification/forgot/reset (shared zod schema'ları ile parse).
- Sayfalar: Login, Register (ad/kullanıcı adı/e-posta/şifre), VerifyEmail (URL'den token, otomatik doğrula), ForgotPassword (resi gönder + 30s cooldown), ResetPassword (token + şifre doğrulama), `features/auth/AuthShell` ortak kart/brand bileşeni.
- `Button`'a `full` değil — size/loading var; Header ve HomePage mevcut UI ile render ediliyor.
- Düzeltmeler: `vite.config.ts` `test` bloğu (vitest/config vite5/vite6 tip çakışmasına yol açtı → `UserConfig` cast); Header'da olmayan `asChild` kullanımı temizlendi.
- Doğrulama: `pnpm --filter @community/web typecheck` ✅, `build` ✅ (PWA generateSW dahil), dev 5173'te çalışıyor; 5173 → 3000 proxy test edildi (yanlış kimlikle 401 INVALID_CREDENTIALS Türkçe mesaj).
- Commit: `#1` (Web auth akışı). Sıradaki: S-1 kalanı (#2) — session yönetimi UI (oturum süresi/revoke) + GitHub OAuth bağlama; sonra S-2 (#3) post editor.

## 2026-09-23 — Durum (S-1 tamam #2: session yönetimi + GitHub OAuth, smoke geçti)

- App bootstrap: `state/bootstrap.ts` — main.tsx render öncesi `await bootstrapAuth()`; localStorage'daki token ile `/api/auth/me` çekilir, 401 ise oturum temizlenir (network hatasında korunur). `createStore` (jotai) render dışı güncelleme için.
- `sessionId` artık istemci saklama katmanında (auth.ts/atoms.ts); login/register yanıtındaki `session.id` kaydedilir → "bu cihaz" rozeti mümkün.
- `/settings/security` (Şifre & Güvenlik): `GET /api/auth/sessions` listesi (ip + cihaz adı + tarih), tekil `POST /sessions/:id/revoke`, `POST /sessions/revoke-all` (mevcut hariç), girişsiz görünümde "Giriş gerekli". Giriş yoksa UI yönlendirme bekler.
- GitHub OAuth: LoginPage'de "GitHub ile devam et" (→ `/api/auth/github`), callback `/auth/oauth/github` fragment `#token=` → url temizlenir → `applyOAuthToken` ile `/api/auth/me` → oturum → `/`. (Not: mevcut hesaba `githubUsername` **bağlama** backend'de state desteği yok; profil kartı GitHub rozeti S-4 ile birlikte yapılacak.)
- `Button`'a `full` prop'u mevcut; Login/Register setSession'a sessionId eklendi.
- Doğrulama: typecheck ✅ build ✅; uçtan uca (proxy üzerinden): register → `sessions` listesi (ip/UA) → tekil revoke → `/me` 401 (token öldü) ✅.
- Commit: `#2`. Sıradaki: S-2 (#3) post editor (draft, poll, görsel) + (#4) feed akışı web tarafı.
