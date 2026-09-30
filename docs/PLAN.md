# Topluluk Platformu — Proje Planı

> Bu dosya "hafıza" olarak kullanılır. Her geliştirme sonrası güncellenir.
> Nerede kaldığımızı buradan takip ederiz.

## 1. Kararlar (sprint öncesi)

- **Konsept:** Geliştirici platformu değil; **futbol oyunları (EA FC, eFootball/PES, Football Manager) oyuncuları** topluluğu. Öneri, kariyer hikayeleri, sorun/çözüm ve tartışma paylaşımı ana kullanımlar.
- **Ürün adı:** "Community" (istek üzerine korundu). Launchpad → **"Kariyer Vitrini"**'ne dönüşecek. GitHub entegrasyonları tamamen kaldırıldı.
- **Backend:** Node.js + TypeScript + Fastify + Drizzle ORM (PostgreSQL)
- **Frontend:** Vite + React + TypeScript + Tailwind v4 + TanStack Query
- **DB:** PostgreSQL (Docker, local); Redis (docker) → rate-limit, cache, Socket.IO adapter, trending
- **Mail:** Resend; **AI:** Anthropic (Claude) — haber taraması + haftalık özet; **Auth:** session-based (kendi auth, e-posta ile)
- **Paket yöneticisi:** pnpm; monorepo (apps/web, apps/api, packages/shared, packages/config)
- **UI dili:** Türkçe; **Repo:** development branch default
- **GitHub:** her issue commit mesajında `#(issueId)` içerir
- **Test:** Vitest (unit+integration), Playwright (e2e), coverage yüksek hedef
- **Tasarım:** vercel.com + framer.com + linear.app sentezi, koyu/açık tema, mobil=SaaS-app (PWA-yi), design system (`components/**/index.tsx`)

## 2. Paylaşılan veri modeli (Drizzle)

| Tablo         | Açıklama |
|---------------|----------|
| users         | email, username, name, bio, avatar, siteUrl, passwordHash, role, isActive |
| email_verifications | doğrulama token'ları (hash'li) |
| password_resets | sıfırlama token'ları (hash'li) |
| sessions      | opaque token (hash'li), expiresAt, revoke desteği |
| posts         | title?, content (≤10k), category (soru/oneri/kariyer/bug/genel), game (ea-fc/efootball/football-manager, opsiyonel), isDraft, source(ai/human) |
| post_flags    | ai üretimi postları işaretleme bilgileri |
| post_images   | post görselleri (sıralamalı, aspect) |
| post_polls    | anket (option'lar, selective-vote) |
| poll_votes    | anket oyları |
| post_likes    | beğeniler (unique userId+postId) |
| bookmarks     | kaydetme |
| comments      | yorum / yanıt (parentId) |
| follows       | takip (followerId, followingId) |
| reports       | şikayet (hedef tip + id, durum) |
| projects      | kullanıcı vitrin kayıtları (kariyer/başarı, logo, cover'lar, launch) — GitHub alanları kaldırıldı |
| project_images| viterin logo + cover görselleri |
| launch_feedback | vitrin yorum / puan |
| topics        | konu etiketleri |
| notifications | bildirimler (tip, entity, readAt, payload) |
| notification_settings | kullanıcı bildirim tercihleri |
| ai_articles   | haftalık AI özet makaleleri (slug, content, week) |

> Not: `user_tools` (araç etiketleri) ve `oauth_accounts` (GitHub bağlantısı) tabloları konsept değişikliğiyle birlikte kaldırıldı.

## 3. Sprint planlaması (Milestone'lar)

- **S-0 Scaffolding:** monorepo, CI, docker-compose (pg+redis), design system temeli, ortak paketler
- **S-1 Auth:** register, login, email doğrulama, forgot/reset, session + revoke (GitHub OAuth yerine e-posta odaklı)
- **S-2 Post oluşturma:** editor (TipTap), görsel yükleme, poll, kategoriler + oyun etiketi, draft yönetimi
- **S-3 Feed:** new/trending/following filtreler, infinite pagination, scroll koruması, lazy-load, detay sayfası
- **S-4 Profil:** profil sayfası, kariyer vitrini kayıtları (CRUD), takip
- **S-5 Kariyer Vitrini:** vitrin akışı, feedback/puanlama, takip/takipten çık, şikayet
- **S-6 Bildirimler & Ayarlar:** WS (Socket.IO + Redis) real-time, toaster, ayarlar sayfaları
- **S-7 AI Haftalık:** cron + haber taraması + Claude özet üretimi + ayrım (ai post badge)
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

## 2026-09-30 — Durum (Konsept revizyonu: futbol oyunları topluluğu; GitHub entegrasyonu kaldırıldı)

- **Konsept kararı** (question tool ile kesinleşti): geliştirici topluluğu yerine **futbol oyunları oyuncuları** topluluğu; ürün adı "Community" kaldı; Launchpad → "Kariyer Vitrini"; GitHub entegrasyonları tamamen kaldırıldı; post'lara opsiyonel **oyun etiketi** (`ea-fc` / `efootball` / `football-manager`) eklendi.
- **Kategoriler değişti:** `soru/fikir/yaptin/genel` → `soru/oneri/kariyer/bug/genel`. `POST_CATEGORIES`, `POST_CATEGORY_LABELS`, `POST_GAMES`, `POST_GAME_LABELS` shared'ta.
- **API/temizlik:** `users.githubUsername`, `user_tools`, `oauth_accounts` kaldırıldı; `projects`'tan `isOpenSource`/`githubUrl`, `env.ts`'ten `GITHUB_*` temizlendi; `auth/github.ts` + web `GithubOAuthCallbackPage` + LoginPage GitHub butonu silindi. Değiştirilenler: users (mapper/service/routes), posts (service: `game` kolonu + draft sahibine `getById` + `feedBaseSql(includeOwnDrafts)`), projects (service/schema), auth routes/service, redis cacheTtl.
- **DB:** `drizzle/0001_public_prism.sql` üretildi ve uygulandı (yeni `post_game` enum + `posts.game`, `post_category` enum değişimi, oauth/tools/github kolonları düşürme). **Drizzle'in ürettiği enum geçişi `DROP TYPE` hatası veriyordu** (kolon default'u tipe bağlı) → migration'a `ALTER COLUMN "category" DROP DEFAULT` + sonrasında `SET DEFAULT 'genel'` eklendi. Migration'lar transactional; hata halinde tamamen rollback oluyor.
- **Web:** NewPostPage'e oyun etiketi (Etiket yok / EA FC / eFootball / Football Manager) chip satırı eklendi; autosave + publish + modal etiketi senkron. `/post/yeni` ve `/taslaklar` rotaları **router'a bağlandı** (NewPostPage + yeni TaslaklarPage: React Query listeleme, kategori+oyun rozeti). HomePage / index.html açıklaması futbol topluluğuna çevrildi. TipTap `StarterKit.configure({ link: false })` kaldırıldı (geçersiz option). Post `api.ts` tipine `game` ve `PostCategory`/`PostGame` eklendi.
- **Bulunan ve düzeltilen bug:** `listDrafts` ve `getById` `feedBaseSql`'in `is_draft = false` filtresini kullandığı için draft'lar hiç dönmüyordu → `feedBaseSql(viewerId, { includeOwnDrafts })` opsiyonu eklendi (`p.is_draft = false OR p.author_id = viewerId`).
- Doğrulama: typecheck ✅ (3 paket), web production build ✅. Migration uygulandı, Docker (pg/redis) ayak kalktı; canlı smoke: register → profil PATCH → post create (`category: kariyer`, `game: efootball`) → post detay (`game` + github'sız author) → draft create → draft getById + `/api/me/drafts` → hesap silme. Smoke verisi temizlendi, API kapatıldı.
- **GitHub senkronu:** milestone #8 "S-5 Launchpad" → **"S-5 Kariyer Vitrini"**; #1 (GitHub notu), #2 (OAuth kaldırıldı), #3 (kategori+oyun etiketi, ✅ kapatıldı), #4 (anket), #5, #6, #7 (GitHub showcase yerine vitrin), #8 (open-source kaldırıldı), #9 (Launchpad → Kariyer Vitrini), #10, #13 (HN/Reddit → futbol haber taraması) güncellendi.
- Sıradaki: S-3 feed (#5, #6), S-4 profil/vitrin (#7, #8), S-5 Kariyer Vitrini (#9, #10).

## 2026-09-23 — Durum (S-1 tamam #2: session yönetimi + GitHub OAuth, smoke geçti)

- App bootstrap: `state/bootstrap.ts` — main.tsx render öncesi `await bootstrapAuth()`; localStorage'daki token ile `/api/auth/me` çekilir, 401 ise oturum temizlenir (network hatasında korunur). `createStore` (jotai) render dışı güncelleme için.
- `sessionId` artık istemci saklama katmanında (auth.ts/atoms.ts); login/register yanıtındaki `session.id` kaydedilir → "bu cihaz" rozeti mümkün.
- `/settings/security` (Şifre & Güvenlik): `GET /api/auth/sessions` listesi (ip + cihaz adı + tarih), tekil `POST /sessions/:id/revoke`, `POST /sessions/revoke-all` (mevcut hariç), girişsiz görünümde "Giriş gerekli". Giriş yoksa UI yönlendirme bekler.
- GitHub OAuth: LoginPage'de "GitHub ile devam et" (→ `/api/auth/github`), callback `/auth/oauth/github` fragment `#token=` → url temizlenir → `applyOAuthToken` ile `/api/auth/me` → oturum → `/`. (Not: mevcut hesaba `githubUsername` **bağlama** backend'de state desteği yok; profil kartı GitHub rozeti S-4 ile birlikte yapılacak.)
- `Button`'a `full` prop'u mevcut; Login/Register setSession'a sessionId eklendi.
- Doğrulama: typecheck ✅ build ✅; uçtan uca (proxy üzerinden): register → `sessions` listesi (ip/UA) → tekil revoke → `/me` 401 (token öldü) ✅.
- Commit: `#2`. Sıradaki: S-2 (#3) post editor (draft, poll, görsel) + (#4) feed akışı web tarafı.

## 2026-09-30 - Durum (Windows .bat scriptleri + kalite altyapisi onarildi)

- Root seviyede 9 adet `.bat` eklendi: `_common.bat`, `setup.bat`, `start.bat`, `start-api.bat`,
  `start-web.bat`, `stop.bat`, `migrate.bat`, `check.bat`, `test.bat`. Hepsi gercekten calistirilip
  dogrulandi (API `/health` ok, web 200, proxy 400/401Turkce hata mesajlari dogru).
- Windows batch gotchasi: baska dosyadaki label`a `call :label` ile erisilemez. `_common.bat` bir
  dispatcher oldu; cagiranlar `call "%ROOT%\_common.bat" :etiket args` kullaniyor.
- ANSI renk kodlari .bat`ta guvenilir degil (ESC karakteri duz metne donusuyordu), isaretler
  duz metne cevrildi: `[OK]`, `[!]`, `[HATA]`, `=== adim ===`.
- `findstr /R` ile `/C` birlikte kullanilamiyor; port kontrolu `findstr /L` ile yazildi.
  Bu yuzden `stop.bat` portlari kapatmiyordu; duzeltildi ve dogrulandi.

### Lint/build altyapisi onarildi (#16)

- `lint` hic calismiyordu: `eslint` binary`si sadece `apps/web` vardi, `@community/config`
  `typescript-eslint` import ediyordu ama paket hic kurulmamisti, ve hicbir paketin de
  `eslint.config.js` dosyasi yoktu. Kurutuldu: workspace root`a `typescript-eslint`, `api` ve
  `shared` paketlerine `eslint`, ucunun de `eslint.config.js` dosyasi.
- Ardindan lint gercek hatalari buldu ve duzeltildi (13 hata): kullanilmayan import`lar
  (`boolean`, `text`, `projects`, `users`, `isNull`, `gte`, `FastifyReply`,
  `FastifyBaseLogger`, `ChangePasswordDto`, `UpdateUsernameDto`, `requesterId`),
  `consistent-type-imports` ihlalleri, ve projede Next.js olmadigi icin `@next/next/no-img-element`
  yorum satirlari.
- `build` de hic calismiyordu: `tsup` kurulu degildi ve `tsup.config.ts` yoktu. Eklendi.
- `pnpm-workspace.yaml` icindeki `allowBuilds` degerleri `set this to true or false` gibi
  placeholder metinlerdi; gercek boolean`lara cevrildi, boylece esbuild postinstall calisiyor.

### Testler (#16)

- Vitest yapilandirmasi hic yoktu ve test dosyasi yoktu. Eklendi: `apps/api/vitest.config.ts`
  (+ `test/setup.ts` ortam degiskenleri), `packages/shared/vitest.config.ts`,
  `apps/web` icin `test` script`i (vitest zaten `vite.config.ts` icinde yapilandirilmis).
- 59 unit test yazildi: API 25 (crypto, errors, pagination), shared 21 (schemas),
  web 13 (cn, auth state). Hepsi gecti.
- `check.bat` (typecheck + lint + build) ve `test.bat` tamamen yesil.

- Commit: `#16`. Siradaki: #16`in kalan kismi (Playwright e2e + GitHub Actions CI), sonra
  #5 feed sayfasi.

## 2026-09-30 - Durum (Playwright e2e + GitHub Actions CI, #16 tamamlandi)

- Playwright kuruldu ve 17 e2e testi yazildi (`e2e/auth.spec.ts`, `e2e/posts.spec.ts`,
  `e2e/fixtures.ts`). Hepsi gecti.
- `vite.config.ts` artik proxy hedefini `VITE_API_PROXY_TARGET` ve portu `PORT`
  ortam degiskenlerinden aliyor; boylece e2e icin 4310/4311 portlari kullanilabiliyor.
- API`de `dev:port` script`i eklemeye gerek kalmadi: `env.ts` zaten `PORT` okuyor,
  Playwright `env` ile veriyor.
- `test.bat` genisletildi: `test.bat e2e` ve `test.bat all` (unit + e2e). Docker ve
  migration`i kendisi hazirliyor. Hepsi dogrulandi.

### e2e sirasinda bulunan ve duzeltilen gercek hata

- `NotFoundPage` hic baglanmamisdi: `router.ts` icinde `notFoundRoute` (`path: "*"`)
  tanimli olsa da kullanilmiyordu ve kok route`ta `notFoundComponent` yoktu. Bilinmeyen
  rotalarda TanStack`in varsayilan "Not Found" metni cikiyordu. Kok route`a
  `notFoundComponent: NotFoundPage` eklendi.

### e2e sirasinda tespit edilen, #1 kapsaminda acik olan eksik

- `NewPostPage` ve `TaslaklarPage` kimliksiz erisimi engellemiyor. API tarafi 401 donuyor
  (guvenli) ama kullanici bos sayfa yerine hata mesaji goruyor. `beforeLoad` korumasi ya da
  yonlendirme eklenmeli. Bu commit`te degistirilmedi, #1 ile islenacak.

### CI (.github/workflows/ci.yml)

- Iki job: `kalite` (typecheck, lint, unit test, build) ve `e2e` (postgres 5433 + redis 6380
  service container, migration, Playwright). Rapor artifact olarak yukleniyor.
- Root `package.json`a `test:e2e` ve `test:e2e:ui` script`leri eklendi.

- Commit: `#16`. S-2 test altyapisi tamamlandi. Siradaki: #5 feed sayfasi.
