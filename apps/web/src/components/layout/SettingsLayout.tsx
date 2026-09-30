import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { cn } from '../../lib/cn';

const SECTIONS = [
  { to: '/settings/profile', label: 'Profil', description: 'Ad, bio, avatar, araçlar' },
  { to: '/settings/security', label: 'Güvenlik', description: 'Şifre, kullanıcı adı, oturumlar' },
  { to: '/settings/notifications', label: 'Bildirimler', description: 'Tercihler' },
  { to: '/settings/account', label: 'Hesap', description: 'E-posta ve hesap silme' },
] as const;

/**
 * Ayarlar alanı ortak yerleşimi: sol menü + içerik alanı. Alt sayfalar
 * `<Outlet />` ile buraya yerleşir, böylece koruma (beforeLoad) tek yerde.
 */
export function SettingsLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <div className="container-page mx-auto max-w-5xl py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ayarlar</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Ayar bölümleri">
          <ul className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
            {SECTIONS.map((section) => {
              const active = pathname === section.to;
              return (
                <li key={section.to} className="shrink-0 md:shrink">
                  <Link
                    to={section.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block rounded-lg px-3 py-2 transition-colors',
                      active
                        ? 'bg-accent-600/10 text-accent-700 dark:text-accent-300'
                        : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
                    )}
                  >
                    <span className="block text-sm font-medium">{section.label}</span>
                    <span className="mt-0.5 hidden text-xs text-ink-500 dark:text-ink-400 md:block">
                      {section.description}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
