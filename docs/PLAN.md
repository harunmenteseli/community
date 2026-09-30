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
- [x] #1 ✔ Web auth akışı — TanStack Query mutation, redirect, guard
- [x] #2 ✔ Session yönetimi UI — liste, revoke, revoke-all, logout düzeltmesi
- [x] #3 ✔ Post editörü — görsel, kategori/oyun etiketi, draft
- [x] #4 ✔ Anket UI — editör, sonuç görünümü, tek oy
- [x] #5 ✔ Feed — filtreler, infinite scroll, post detay
- [ ] #6 Like/bookmark + optimistic UI (sıradaki)

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

## 2026-09-30 - Durum (Feed sayfasi, #5 tamamlandi)

- /feed sayfasi eklendi (pps/web/src/pages/FeedPage.tsx), router'a /feed ve
  /post/ rotalari tanimlandi. Ana sayfaya ve header'a feed girisleri kondu.
- PostCard, FeedFiltersBar, FeedList bilesenleri yazildi: yeni/trend/takip sekmeleri,
  kategori ve oyun filtreleri, IntersectionObserver tabanli infinite scroll + "daha fazla
  goster" butonu, skeleton/ bos durum / hata durumlari.
- Post detay sayfasi (PostDetailPage) ve yorum bolumu (CommentSection) eklendi:
  icerik, gorseller, anket ozeti, yorum listesi, yorum yazma ve kendi yorumunu silme.
- Backend'de kategori/oyun filtresi destegi: eedParamsSchema genisletildi,
  postsService.feed ilters parametresi aliyor, eedBaseSql WHERE blokunu
  birlestirilecek clause listesi haline getirdi.
- Redis trend onbellegi artik sadece filtresiz ilk "trend" sayfasinda kullaniliyor
  (filtreli istekler yanlis veri donmesin diye).
- 13 yeni e2e testi (e2e/feed.spec.ts): uc filtre, kategori/oyun filtresi, cursor
  sayfalama, gecersiz parametre 400, feed arayuzu, detay sayfasi, yorum yazma.
  Toplam e2e 17 -> 30. Unit test 59 -> 67 (shared 21 -> 29, eedParamsSchema testleri).
- Header'daki "Yeni Post" butonu / yerine /post/yeni rotasina gider (hata duzeltildi).
- like/ookmark butonlari bilerek kapsam disi birakildi: #6'da optimistic UI ile
  birlikte eklenilecek. Bu commit sadece sayaclari gosteriyor.

### Bu is sirasinda bulunan ve duzeltilen gercek hatalar

1. **Anonim feed istegi 500 donuyordu.** eedBaseSql oturumsuz istekte iewerId olarak
   bos string gonderiyordu; Postgres bunu uuid olarak reddediyordu. Artik 
ull
   gonderiliyor (EXISTS(... = NULL) false doner, dogru sonuc). /api/feed sifirsiz
   oturumla calisiyor.
2. **Cursor sayfalamasi sayfa 2'de patliyordu.** postgres surucusu created_at
   degerini surume gore string donduruyor; kod created_at.toISOString() cagirinca
   500 veriyordu, yani infinite scroll ilk sayfadan sonra calismiyordu. 	oIso()
   yardimcisi eklendi ve createdAt/updatedAt alanlari API'de string olarak
   donduruluyor.
3. **Oturum geri yukleme hicbir zaman calismiyordu.** ootstrapAuth() ayri bir jotai
   store olusturuyor ve ona yaziyordu, ama uygulama bu store'u <Provider> ile
   React'e vermiyordu; bilesenler her zaman bos varsayilan store'u okuyordu. Sadece
   login sirasinda yazilan user localStorage'da cache'lenmisse durum "dogru"
   gorunuyordu. main.tsx icine jotai Provider eklendi.
4. **Tum .bat dosyalari LF satir sonu ile yazilmis.** cmd.exe goto :etiket ve
   call :etiket aramalarini bu dosyalarda cozemiyordu ("The system cannot find the
   batch label specified"). Tum batch dosyalari CRLF'e cevrildi ve check.bat /
   stop.bat uctan uca dogrulandi.
5. **_common.bat port yardimcilari yanlis arguman okuyordu.** Dispatcher
   goto %~1 yaptigi icin %1 her zaman etiketin kendisi; kill_port/warn_port
   portu %~1'den okuyordu ve ekrana Port :kill_port yaziyordu. Artik %~2
   kullaniliyor ve stop.bat gercekten portlari kapatiyor.
6. **CI e2e job'i calisir durumda degildi.** postgres service portu 5433:5433
   idi (container 5432'de dinliyor) ve DATABASE_URL/REDIS_URL/SESSION_SECRET
   sadece migration adiminda scope'lu tanimliydi; Playwright'in baslattigi API child
   process bunlari gormuyordu. Port eslemesi duzeltildi, env'ler job seviyesine
   tasindi, playwright.config.ts de bunlari acikca child process'e aktariyor.
7. **migrate.bat studio eksikti.** Original hedefte istenen Drizzle Studio modu
   eklendi.

### Sonuc

- check.bat yesil (typecheck + lint + build), 67 unit test ve 30 e2e test gecti.
- Commit: #5. Siradaki: #6 (like/bookmark + optimistic UI).

## 2026-09-30 — Durum (#1, #2 ve #4 tamamlandi)

### #1 Web auth akisi

- Login/Register/VerifyEmail/ForgotPassword/ResetPassword sayfalari kendi
  `useState` + elle `try/catch` akislarini birakti; artik TanStack Query
  `useMutation` kullaniyor (loading/error istenen durumlar mutation state'inden).
- `useRedirectTarget` eklendi: `/login?redirect=/post/yeni` ile giris sonrasi
  istenen sayfaya donuluyor, varsayilan `/feed`. `//evil.com` gibi degerler
  reddediliyor (open redirect korumasi).
- Korumali sayfalar (`/post/yeni`, `/taslaklar`, `/settings/security`) giris
  cagrisina kendi `redirect` degerini ekliyor.
- Dogrulama: `/verify-email` artik mount'ta tek seferde calisan bir mutation;
  onceki `useEffect` + `active` bayragi yerine `retry: false` kullaniliyor.

### #2 Session yonetimi

- `SecurityPage` session listesini `useQuery`, revoke/revoke-all islemlerini
  `useMutation` ile yonetiyor; liste degisimi `invalidateQueries` ile.
- **Bulunan gercek hata:** `Header.onLogout` once `clearSession()` cagirip
  sonra `authApi.logout()` atiyordu. Token localStorage'dan silinince istek
  `Authorization` basligi olmadan gidiyor, sunucu oturumu kapatmiyordu ve o
  oturum guvenlik sayfasinda aktif kalmaya devam ediyordu. Sira degistirildi:
  once sunucuya bildir, sonra yerel oturumu temizle.

### #4 Anket UI

- Editor: `PollEditor` (soru zorunlu, 2-10 secenek, ekle/kaldir, canli hata
  mesaji). Anket hem otomatik taslak kaydina hem yayinlamaya gidiyor; yarim
  anket taslagi bozmuyor (`toPollDto` gecersizse `undefined` doner).
- Sonuc gorunumu: `PollBox` yuzde dolgusu, toplam oy, "(oyun)" isareti, kapali
  anket kilit rozeti ve tek-oy ipucu. Oylamadan sonra post detayi invalidate
  ediliyor, yarista gelen cevaplara karsi sunucu gercegi esas aliniyor.
- Feed karti artik toplam oy, kendi oyunu ve "Oy ver" cagrisi gosteriyor.
- **Bulunan gercek hata (backend):** `voteOnPoll` toggle mantigi bozuktu.
  Kullanici ayni secenek tekrar basinca oy siliniyor, sonra `found.totalVotes
  - 1` ve `+1` ile ayni oy yeniden ekleniyordu; yani oyun geri alinamiyordu.
  Artik uc dal var: ayni secenege tekrar bas -> oyu geri al, farkli secenek ->
  oyu tasi (toplam degismez), oy yok -> ekle. Toplam sayac `+/-1` yerine
  `poll_votes` sayilarak yeniden hesaplaniyor.
- **Bulunan gercek hata (backend):** `loadPoll` `question: ''` ve
  `closed: false` donuyordu; oy sonrasi UI'da anket sorusu ve kapali bilgisi
  kayboluyordu. Artik poll satirinin tamamini aliyor.
- **Bulunan gercek hata (backend):** `update` icinde
  `input.title ?? undefined === undefined ? undefined : ...` operator onceligi
  hatasi tiydu; hicbir zaman false olmadigi icin `title` her zaman `undefined`
  gidiyordu, yani taslak basligi hicbir zaman guncellenmiyordu.

### Dogrulama

- Yeni testler: auth sayfalari ve redirect (8), oturum yonetimi (5), anket
  (11 UI + API), `PollEditor` unit testleri (9).
- Playwright tuzagi: `getByRole({ name })` alt-dize eslestiriyor; "Diğerlerini
  kapat" butonu "Kapat" ile cakisiyordu. Buton adlarinda `exact: true`
  kullanilmali.

### Sonuc

- check.bat yesil (typecheck + lint + build), 76 unit test ve 52 e2e test gecti.
- Commit: #1, #2, #4. Siradaki: #6 (like/bookmark + optimistic UI).

## 2026-09-30 — Durum (#6 tamamlandi)

### #6 Post etkilesimleri: like/bookmark + optimistic UI

- `ReactionButtons` (kart + detay ortak): kalp ve kaydetme butonlari
  `aria-pressed` ile durum bildiriyor, sayilar `tabular-nums` ile hizali;
  detayda sayilar her zaman gorunuyor, kartta 0 iken gizleniyor. Butonlar
  karta bagli degil, yalnizca `Link` yorum baglantisi karta.
- `usePostReaction`: `onMutate` icinde once UI guncelleniyor (optimistic),
  istek basarisiz olursa `onMutate`'ten saklanan `['post', id]` ve tum
  `['feed', ...]` infinity cache'leri `onError`'da eski haline donuyor ve
  `toast.error` ile bildiriliyor. `onSuccess` sunucudan gelen mutlak degeri
  (`{ liked }` / `{ bookmarked }`) uyguluyor; yarista basilan buton durumu
  kaybolmuyor.
- Ayni post `['feed']` icinde birden fazla sayfada geciyorsa hepsi guncelleniyor
  (`patchFeedCache`), detay sayfasi ayni anda `['post', id]` cache'ini kullaniyor.
- Oturumsuz kullanici begenince sayfa yenilenmiyor; `?redirect=` korumali sekilde
  `/login` sayfasina gonderiliyor (post yolu korunuyor).
- Kategori/oyun/AI rozetleri `PostCard`'da zaten vardi, degisiklik yapilmadi.

### Dogrulama

- Yeni testler: `reactions` unit (14) ve `e2e/reactions.spec.ts` (10): artirma/
  azaltma, kaydetme, feed karti ile detayin esitlenmesi, oturumsuz yonlendirme,
  rollback, iki kullanicinin toplami, kendine bildirim olusmamasi, API 401/404
  ve post cevabindaki `likedByMe/bookmarkedByMe` yansimasi.
- Rollback testi ilk yazimda yaritti: hata cevabi aninda dondugu icin optimistic
  durum gozlenemeden rollback oluyordu. Artik `page.route` cevabi bir `Promise`
  kapisi bekletiyor, boylece optimistic durum kesin goruluyor.
- Build `tsc --noEmit` `noUncheckedIndexedAccess` ile testlerden katı: testlerde
  `pages[0]` erisimleri opsiyonel zincirle yazildi.

### Sonuc

- check.bat yesil (typecheck + lint + build), 90 unit test (29 shared + 25 api +
  36 web) ve 62 e2e test gecti.
- Commit: #6. Siradaki: #7 (profil rotasi).

## 2026-09-30 - Durum (#7 tamamlandi)

### #7 Profil sayfasi + istatistikler + takip

- Yeni rotalar: `/u/$username` (profil) ve `/ayarlar/profil` (duzenleme).
  Profil sayfasi bio, avatar, site baglantisi, uyelik tarihi, `post/vitrin/
  takipci/takip` sayaclari ve vitrin kayitlari grid'ini gosteriyor.
- `useFollow` optimistic: `onMutate` takip durumunu ve takipci sayacini aninda
  guncelliyor, hata halinde eski cache konuyor, `onSettled` ile profil ve feed
  invalidate ediliyor. Kendine takip butonu hic gosterilmiyor; oturumsuz
  kullanici `?redirect=` ile girise yonlendiriliyor.
- Profil duzenleme: ad, bio (oyun tercihleri buraya yaziliyor), site baglantisi
  ve avatar yukleme. Avatar once `POST /api/uploads?kind=avatar` ile gonderiliyor,
  sonra `PATCH /api/users/me` ile `avatarUrl` yaziliyor; `updateProfileSchema`
  `.strict()` oldugu icin `avatarUrl` opsiyonel alan olarak eklendi ve
  `usersService.updateProfile` yalnizca gonderildiginde yaziyor.
- Yazar baglantilari: `PostCard`, `PostDetailPage` ve `Header` artik
  `/u/$username` rotasina gidiyor (PostCard'daki #7 notu kaldirildi).

### Bulunan gercek hatalar

- **Takip butonu ters calisiyordu:** `useFollow.toggle` mevcut durumu okuyup
  `mutate(!current)` yerine yanlis yonu gonderiyordu; "Takip et" `unfollow`
  cagirip "Takiptesin" `follow` cagriyordu. Artik mutation hedef durumu
  (`wantFollowing`) tasiyor.
- **`@hookform/resolvers` v3 + zod v4 uyumsuz:** paket resolver'i dogrudan
  ZodError firlatiyor, form gonderimi sessizce hic dogrulanmiyordu. Proje ici
  `apps/web/src/lib/validation.ts` resolver'i kullaniliyor (auth sayfalari
  zaten onu kullaniyor).
- **Multipart yukleme kirikti:** `http.post` govdeyi `JSON.stringify` ediyor,
  `FormData` `"{}"` olarak gidiyor ve Fastify "the request is not multipart"
  diyordu; yani post gorsel yukleme de calismiyordu. `http.upload` eklendi,
  `postsApi.uploadImage` ve `usersApi.uploadAvatar` bunu kullanıyor.
- **Rate limit 429 yerine 500 donuyordu:** `@fastify/rate-limit` yaniti hata
  olarak firlatiyor, global error handler da bunu "İşlenmemiş hata" 500'e
  ceviriyordu. `errorResponseBuilder` ciktisina `statusCode: 429` eklendi ve
  handler `statusCode === 429` durumunu 429 olarak donduruyor.
- **Testler limiti asmaya basliyordu:** tum e2e istekleri tek IP'den geliyor ve
  global limit 300/dk idi; 76 testlik paket limiti asiyordu. Limit artik sadece
  production'da 300/dk, diger ortamlarda 2000/dk.

### Dogrulama

- Yeni testler: `updateProfileSchema` unit (6) ve `e2e/profile.spec.ts` (14):
  istatistikler, post sayaci, kendi profili, takip/takipten cik (optimistic +
  kalici), oturumsuz giris cagrisi, 404, yazardan profile gecis, profil
  guncelleme, gecersiz baglanti, avatar yukleme, API 401/400/404.
- `e2e/auth.spec.ts` sonuna rate limit testi eklendi (limit asimi 429 donmeli).
- Playwright tuzagi: Header'daki "Giriş yap" linki sayfa iciyle cakisiyor;
  `page.getByRole('main')` ile kapsam daraltildi.

### Sonuc

- check.bat yesil (typecheck + lint + build), 96 unit test (35 shared + 25 api +
  36 web) ve 77 e2e test gecti.
- Commit: #7. Siradaki: #8.

## 2026-09-30 - Durum (#8 tamamlandi)

### Yapilanlar

- Vitrin kaydi formu (`apps/web/src/pages/ProjectFormPage.tsx`): ad, baglanti,
  kategori, aciklama, "nelerle gelistirildi" etiket girisi (Enter veya "Ekle"
  butonu, etiket kaldirma), yayinda onay kutusu, logo (1:1) ve kapak gorseli
  (en fazla 5) yukleme. Ayni bileşen `/vitrin/yeni` ve `/vitrin/$projectId`
  (duzenleme) rotalarinda kullaniliyor; duzenlemede `GET /api/projects/:id`
  verisi formu dolduruyor.
- Vitrin kayitlari listesi (`apps/web/src/pages/ShowcasePage.tsx`):
  `/vitrin` altinda kayitlar, duzenleme (kalem) ve silme (cop) butonlari,
  silmede ikinci onay blogu. Oturumsuz erisimde giris cagrisi ve
  `?redirect` ile donus.
- API katmani (`apps/web/src/features/projects/api.ts`): `projectsApi` ile
  create / `mine` / `get` / `update` / `remove` ve `kind=logo` / `kind=cover`
  multipart yukleme. Logo ve kapak limitleri API tarafinda zaten uygulandi
  (PROJECT_LOGO_MAX_MB, PROJECT_COVER_MAX_MB, PROJECT_COVER_MAX_COUNT).
- Header'a "Vitrin" baglantisi eklendi.
- Rotalar: `/vitrin`, `/vitrin/yeni`, `/vitrin/$projectId`.

### Duzeltilen hatalar

- `Field` bileseni `htmlFor` icin `id` ya da `name` bekliyor; ikisi de
  verilmediginde label input'a baglanmiyordu (erisilebilirlik hatasi). Forma
  `id` degerleri eklendi.
- Vitrin kaydi olusturma akisi shared `createProjectSchema` ile de
  dogrulanir; gecersiz baglantida hata mesaji form ustunde gosterilir.
- API tarafi hazirdi, degisiklik gerekmedi: `POST /api/projects`,
  `GET /api/me/projects`, `PATCH`/`DELETE /api/projects/:id` (sahip kontrolu
  ile 403), `GET /api/users/:username/projects` yalnizca `launched = true`
  kayitlari donuyor (taslaklar profilde gizli, sayac yine artiyor).

### Testler

- Yeni: `e2e/showcase.spec.ts` (7 test) - kayit olusturma ve listede
  gorunum, profil sayaci + taslak gizliligi + yayina alininca gorunme,
  duzenleme (ad, etiket, yayinda), silme (onayli), logo + kapak yukleme,
  oturumsuz giris cagrisi, API 400/401 ve sahip olmayan kullanicida 403
  (kaydin durdugunun dogrulanmasiyla).
- Playwright notu: `getByRole('button', { name: 'Ekle' })` butonu "Kapak
  ekle" ile cakisiyor, `exact: true` ile daraltildi. Turkce karakter iceren
  metin eslesmelerinde diakritik duyarsiz arama yapilmadigi icin metinler
  birebir ayni yazildi.

### Sonuc

- check.bat yesil (typecheck + lint + build), 96 unit test (35 shared + 25 api +
  36 web) ve 84 e2e test gecti.
- Commit: #8. Siradaki: #9 (Kariyer Vitrini akisi).

## 2026-09-30 - Durum (#9 tamamlandi)

### Yapilanlar

- `/kariyer-vitrini` akisi (`CareerShowcasePage.tsx`): yayindaki vitrin
  kayitlari, "Yeni" / "Popüler" siralamasi (tab, `role="tab"`), infinite scroll +
  "Daha fazla goster", kart basina kapak gorseli, logo, kategori, aciklama,
  buildWith etiketleri, yazar linki, ortalama puan (10'lu gosterim) ve yorum
  sayaci.
- "Yorum & Puan" modal (`FeedbackModal.tsx`): 1-10 yildiz puan girisi,
  yorum alani (max 1000 karakter), mevcut feedback ile form on doldurma,
  "Son yorumlar" listesi, oturumsuz kullanicida giris uyarisi. Basarili
  gonderimde kart ve liste cache'i invalidate edilir.
- Sahibi olan kayitlarda kart uzerinde "Vitrinden kaldir" butonu
  (`POST /api/launchpad/:id/unlaunch`), yine de `/vitrin` ekranindan
  duzenleme ile geri yayina alinabiliyor.
- API katmani (`apps/web/src/features/launchpad/api.ts`): liste (sort/cursor/
  limit), detay, feedback, launch/unlaunch.
- Header'a "Kariyer Vitrini" baglantisi eklendi.

### Duzeltilen hatalar

- **Puan olcegi issue ile uyumsuzdu**: API 1-5 araligini kabul ediyordu,
  issue 1-10 diyor. Servis 1-10 araligina ve tam sayi kontrolune gecirildi
  (ondalik puan kabul edilmiyor).
- **"yeni" siralamasinda sayfalama bozuktu**: `listLaunched` cursor'u `yeni`
  dalinda hic dikkate almiyor, `nextCursor` hep `'1'` donuyordu; "daha fazla"
  ayni ilk sayfayi tekrar getiriyordu. Her iki dalda da offset tabanli
  sayfalama ve gecersiz cursor'da ilk sayfaya dusulmesi eklendi.
- **Liste yanitinda sahip bilgisi yoktu**: `GET /api/launchpad` yalnizca proje
  satirlarini donuyordu, `owner` sadece detay ucunda vardi; bu yuzden kartta
  yazar linki ve "Vitrinden kaldir" butonu hic render edilemiyordu. Tek sorguda
  sahip haritasi (batch `inArray`) eklenip her kayda `owner` eklendi.
- **Feedback yorumlari sayfayi cokertiyordu**: API `listFeedback` sonucu
  yazari `author` altinda donuyor, web tarafi `user` okuyordu; ilk yorumdan
  sonra `Cannot read properties of undefined (reading 'avatarUrl')` ile error
  boundary devreye giriyordu. Web tipleri API sozlesmesiyle hizalandi.
- **Puan onaylamasi geri aliniyordu**: modal acildiktan sonra gelen arka plan
  refetch'i (invalidate) formu yeniden dolduruyor, kullaniciyi yaptigi secimi
  sessizce geri aliyordu. On dolgu `useRef` ile "bir kez" kilitlendi.

### Testler

- Yeni: `e2e/launchpad.spec.ts` (8 test) - yayindaki/taslak ayrimi, "yeni" ve
  "populer" siralamasi, 1-10 puan + yorum gonderimi (ortalama ve sayaç
  guncellemesi), puan guncellemesinin mevcut feedback'i guncellemesi, oturumsuz
  giris uyarisi, sahibin vitrinden kaldirip geri eklemesi, API 400 (0 ve 11),
  401, 404, kendi projesine puan yasagi, cursor ile sayfalama (tekrarlanan kayit
  yok, sonunda null) ve gecersiz cursor davranisi.
- `e2e/fixtures.ts` -> `profileStat(page, label)` yardimcisi eklendi. #7'den
  kalan `getByText('Vitrin').locator('..').getByText('1')` yazimi aslinda
  kullanici adi ya da "tarihinden beri uye" metnine denk gelip yanlis geciyordu
  ve zamanlamaya bagli olarak strict mode violation'a donusuyordu; ayni sorun
  `getByRole('link', { name: 'Giriş yap' })` icin de vardi (Header + profil
  cagrisi), `main` icinde kapsam daraltildi.
- Testler ayni veritabanini paylastigi icin vitrin kartlarinin adlari
  `uniqueName()` ile benzersizlestirildi; sayfalama testi mutlak kayit sayisina
  degil "sayfalar tekrarlamiyor ve cursor null'a donuyor" kontrolune bakiyor.
- Toast uzerinden senkronizasyon yapilmadi: sonner toast'i birkac saniye
  gorunur kaldigi icin eski toast'a bakan assertion'lar yeni istek commit
  olmadan API okumasi yapabiliyordu; kart uzerindeki ortalama kullanildi.

### Sonuc

- check.bat yesil (typecheck + lint + build), 96 unit test (35 shared + 25 api +
  36 web) ve 92 e2e test gecti.
- Commit: #9. Siradaki: #10 (takip/takipten cik + sikayet UI).

## 2026-09-30 - Durum (#10 tamamlandi)

### Yapilanlar

- **Sikayet backend'i** (`apps/api/src/modules/reports/`): `POST /api/reports`
  (post / kullanici / vitrin kaydi hedefli, `spam|abuse|scam|nsfw|other`
  sebebi, 1000 karakter aciklama), hedef varlik kontrolu, ayni hedef icin
  bekleyen sikayet engeli (409), `GET /api/reports/mine` ve yonetici icin
  `POST /api/reports/:id/resolve`. `reports` tablosuna `status`
  (pending/approved/rejected) ve `resolved_by` kolonlari eklendi
  (`0002_warm_namorita.sql`).
- **S-6**: rapor sonuclandirildiginde raporlayan kullaniciya `reportUpdate`
  tipinde bildirim gider. Bildirim bir kullanici eylemi degil, moderasyon
  sonucu oldugu icin `actorId: null` ile gonderiliyor; aksi halde bildirimin
  kendini gonderene gitmemesi filtresi devreye giriyordu.
- **Sikayet modalı** (`features/reports/ReportModal.tsx`): sebep secimi,
  aciklama alani, "Diger" icin aciklama zorunlulugu, oturumsuz kullanici ve
  kendini sikayet etme durumlarinda bilgilendirme. `ReportButton` ile post
  karti, post detay sayfasi, profil ve Kariyer Vitrini kartlarina baglandi.
- **Post uzerinde takip butonu** (`AuthorFollowButton` + `useAuthorFollow`):
  takip/takipten cik aninda (optimistic) calisiyor, hata halinde feed ve post
  detay cache'ini geri aliyor. Kendi gonderisinde ve oturumsuz durumda
  gosterilmiyor.
- `AuthUser` tipine `role` eklendi; yonetici kontrolu role dayaniyor.
- Kullanilmayan `POST /api/users/:username/report` ucu ve
  `usersService.report` kaldirildi: dogrulama tek yerde (`reports` servisi)
  toplandi, aksi halde iki farkli rapor yolu birbirini dogrulamadan besliyordu.

### Testler

- Yeni: `e2e/reports.spec.ts` (7 test) - post sikayeti (modal dogrulamalari:
  sebep secilmeden "Bir sebep sec", "Diger" icin aciklama uyarisi, sonra basarili
  gonderim ve `/api/reports/mine` icinde pending kayit), ayni hedefe ikinci
  sikayetin 409 olmasi, vitrin kaydi sikayeti, oturumsuz kullanicinin gonderi
  bildirememesi, kendi profilinde sikayet butonunun olmamasi, API dogrulamalari
  (401 / gecersiz hedef turu / gecersiz sebep / olmayan hedef 404 / kendini
  sikayet 400) ve yonetici akisi (403, resolve, cift sonuclandirma 409,
  raporlayana `reportUpdate` bildirimi).
- `e2e/feed.spec.ts` -> post kartindan yazari takip et/takipten cik testi
  (optimistic dugme metni + API dogrulamasi).
- Yeni unit testler: `options.test.ts` (sikayet dogrulamasi, kendini sikayet
  kontrolu) ve `follows.test.ts` (takip cache yamalari, referans korumasi).
- `e2e/fixtures.ts` -> `createAdmin()`: moderasyon ucu yonetici rolu istiyor,
  rolu atayan API yok. Testte hesap dogrudan veritabaninda yoneticiye
  yukseltiliyor (`postgres` kok devDependency olarak eklendi); kalici bir admin
  hesabi paylasilan test veritabanini kirletirdi.

### Sonuc

- check.bat yesil, 111 unit test (35 shared + 25 api + 51 web) ve 100 e2e test
  gecti.
- Commit: #10. Siradaki: #11.

## 2026-09-30 - Durum (#11 tamamlandi)

### Yapilanlar

- **Socket.IO istemcisi** (`useRealtimeNotifications`): `RootLayout` icinde
  token varsa baglanir, cikisinda soketi kapatir. `notification:new` →
  bildirim listesinin basina ekler, okunmamis sayacini artirir, toaster gosterir;
  `notifications:unread` → sayaci sunucudan gelen degerle hizalar. Adres her
  zaman ayni origin (vite proxy /socket.io'yu API'ye yonlendiriyor).
- **Bildirim rozeti** (`NotificationBell`): header'da zil + okunmamis rozeti
  (`99+` kirpmasi), oturumsuzda hic render edilmiyor. Ilk deger HTTP'den,
  sonraki guncellemeler soketten gelir.
- **Bildirim merkezi** (`/bildirimler`): Tümü / Okunmamış sekmeleri (filtre
  sunucuda `?filter=unread` ile), sayfalama ("Daha fazla"), tek bildirimi
  okundu isaretleme (satır veya bağlantıya tıklayınca), "Tümünü okundu
  işaretle", boş durumlar, okunmamış satır vurgusu, oturumsuz giriş çağrısı.
- **Bildirim metinleri** (`features/notifications/format.ts`): sunucu sadece
  tip/aktör gönderiyor; okunabilir metin ve yönlendirme istemcide üretiliyor
  (`follow`, `like`, `comment`, `reply`, `mention`, `launch`, `reportUpdate`).
- Backend: `GET /api/notifications?filter=unread`, tek bildirim okunduğunda
  `notification:read` olayı **kalan sayacı** taşıyor (önce hiç yayınlanmıyordu,
  diğer sekmede rozet eski kalıyordu).
- Backend: canlı bildirim payload'ı listedeki şekle hizalandı (aktör bilgisi
  eklendi); toaster aksi halde "Sistem gönderini beğendi" diyordu.

### Duzeltilen hatalar

- **WS handshake CORS ile reddediliyordu**: `env.APP_URL` şeması `z.string().url()`
  ile tek origin doğruluyor, kod ise `env.APP_URL.split(',')` ile liste bekliyordu.
  Çoklu origin sessizce bozuktu (e2e'de soket hiç bağlanamıyordu). Şema artık
  virgülle ayrılmış origin listesini doğruluyor ve liste olarak dışa veriyor.
- **Soket el sıkışmasında token biçimi yanlıştı**: istemci `auth: { token }`
  ile prefixesiz token gönderiyor, sunucu ise `Bearer <token>` bekliyordu →
  her bağlantı "unauthorized" ile kapanıyordu, bildirimler hiç canlı gelmiyordu.
- `playwright.config.ts` → e2e API'sine `APP_URL` veriliyor: WebSocket
  handshake'te tarayici daima `Origin` başlığı gönderiyor, `/api` istekleri
  ise proxy'den aynı origin olarak gidiyor.
- Tek bildirim okununca rozet diğer sekmede sıfırlanmıyordu (sadece "tümünü
  okundu" olayı yayınlanıyordu).

### Testler

- Yeni: `e2e/notifications.spec.ts` (4 test) - soket bağlantısı beklenir,
  başka kullanıcı takip ettiğinde **sayfa yenilenmeden** rozet 1 olur ve
  toaster görünür; merkezden tek bildirim okununca rozet söner, "Tümü"
  listesinde kalır ve "Okunmamış" sekmesinden çıkar; iki bildirimle filtre +
  "Tümünü okundu işaretle" akışı; `filter=unread` API'si ve unread-count
  tutarlılığı; oturumsuz erişim (sayfa uyarısı + 401).
- Yeni unit testler: `format.test.ts` (metin/bağlantı üretimi, bilinmeyen tip),
  `prepend.test.ts` (cache yaması, tekrar eklememe, bozuk cache koruması).
- Canlı testler deterministik olsun diye soket bağlantı durumu
  `window.__communityRealtime` altında tutuluyor; olay, soket bağlı değilken
  sessizce kaçırıldığı için test önce bağlantıyı bekliyor.

### Sonuc

- check.bat yeşil, 121 unit test (35 shared + 25 api + 61 web) ve 104 e2e test
  geçti.
- Commit: #11. Sıradaki: #12 (ayarlar sayfaları).
