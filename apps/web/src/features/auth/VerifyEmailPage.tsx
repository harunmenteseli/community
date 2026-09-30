import { useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { AuthShell } from './AuthShell';
import { authApi } from './api';
import { ApiError } from '../../lib/api';
import { Spinner } from '../../components/ui/spinner';

export function VerifyEmailPage() {
  const location = useLocation();
  const token = new URLSearchParams(location.searchStr ?? '').get('token');

  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyEmail(value),
    // Link tekrar tiklanirsa ayni token ikinci kez gonderilmesin.
    retry: false,
  });

  useEffect(() => {
    if (!token || verify.isPending || verify.isSuccess || verify.isError) return;
    verify.mutate(token);
    // Yalnizca mount'ta ve token degisince calisir.
  }, [token, verify]);

  const status = !token || verify.isError ? 'error' : verify.isSuccess ? 'success' : 'checking';
  const message = !token
    ? 'Doğrulama linki geçersiz. E-posta kutunu kontrol et.'
    : verify.error instanceof ApiError
      ? verify.error.message
      : verify.error
        ? 'Doğrulama sırasında bir hata oluştu'
        : '';

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
          <Link
            to="/login"
            search={{ redirect: '/feed' }}
            className="rounded-md bg-accent-600 px-4 py-2 text-sm font-medium text-white"
          >
            Giriş yap
          </Link>
        ) : null}
      </div>
    </AuthShell>
  );
}
