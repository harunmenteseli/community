import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { cn } from '../../lib/cn';

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg font-bold text-white',
        className,
      )}
      style={{ backgroundImage: 'linear-gradient(135deg, #7c5cff 0%, #4f46e5 55%, #0ea5e9 100%)' }}
      aria-hidden="true"
    >
      C
    </span>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="container-page flex min-h-[calc(100dvh-5rem)] flex-col items-center justify-center py-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Community ana sayfa">
          <BrandMark />
          <span className="text-lg font-semibold tracking-tight">Community</span>
        </Link>
        {title ? <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1> : null}
        {subtitle ? <p className="text-sm text-ink-500 dark:text-ink-400">{subtitle}</p> : null}
      </div>

      <div className="w-full max-w-sm rounded-xl border border-ink-200 bg-white p-6 shadow-card dark:border-ink-800 dark:bg-ink-900">
        {children}
      </div>

      {footer ? <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">{footer}</p> : null}
    </div>
  );
}