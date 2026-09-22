import { useEffect } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Header } from './Header';

function getInitialTheme(): 'dark' | 'light' {
  try {
    const saved = localStorage.getItem('community.theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* localStorage erişilemezse sistem tercihi */
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function RootLayout() {
  useEffect(() => {
    const theme = getInitialTheme();
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-white text-ink-900 dark:bg-ink-950 dark:text-ink-100">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-ink-200 py-6 dark:border-ink-800">
        <div className="container-page flex flex-col items-center justify-between gap-2 text-sm text-ink-500 dark:text-ink-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Community — Geliştiriciler için topluluk.</span>
          <span className="flex items-center gap-4">
            <span className="cursor-default">Made with ♥</span>
          </span>
        </div>
      </footer>
    </div>
  );
}