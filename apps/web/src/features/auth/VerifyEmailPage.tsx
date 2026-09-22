import { useEffect, useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { AuthShell } from './AuthShell';
import { authApi } from './api';
import { ApiError } from '../../lib/api';
import { Spinner } from '../../components/ui/spinner';

type Status = 'checking' | 'success' | 'error';

export function VerifyEmailPage() {
  const location = useLocation();
  const [status, setStatus] = useState<Status>('checking');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const token = new URLSearchParams(location.searchStr ?? '').get('token');
    if (!token) {
      setStatus('error');
      setMessage('Doğrulama linki geçersiz. E-posta kutunu kontrol et.');
      return;
    }
    let active = true;
    authApi
      .verifyEmail(token)
      .then(() => {
        if (active) setStatus('success');
      })
      .catch((err: unknown) => {
        if (!active) return;
        setStatus('error');
        setMessage(err instanceof ApiError ? err.message : 'Doğrulama sırasında bir hata oluştu');
      });
    return () => {
      active = false;
    };
  }, [location.searchStr]);

  return (
    <AuthShell title="E-posta doğrulama">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {status === 'checking' ? <Spinner className="h-6 w-6" /> : null}
        {status === 'success' ? (
          <p className="text-sm text-ink-600 dark:text-ink-300">
            E-postan doğrulandı. Artık topluluğa katılabilirsin.
          </p>
        ) : null}
        {status === 'error' ? <p className="text-sm text-red-600 dark:text-red-400">{message}</p> : null}

        {status === 'success' ? (
          <Link to="/" className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white">
            Ana sayfaya git
          </Link>
        ) : null}
      </div>
    </AuthShell>
  );
}