import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { AuthShell } from './AuthShell';
import { applyOAuthToken } from '../../state/bootstrap';
import { Spinner } from '../../components/ui/spinner';

type Status = 'loading' | 'error';

export function GithubOAuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let active = true;
    const raw = window.location.hash.replace(/^#/, '');
    const token = new URLSearchParams(raw).get('token');

    if (!token) {
      if (active) setMessage('GitHub ile giriş başarısız oldu. Lütfen tekrar dene.');
      return;
    }

    history.replaceState(null, '', window.location.pathname);
    applyOAuthToken(token)
      .then((ok) => {
        if (!active) return;
        if (ok) {
          void navigate({ to: '/' });
        } else {
          setMessage('Oturum kurulamadı. Lütfen tekrar dene.');
        }
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <AuthShell title="GitHub ile giriş">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        {!message ? <Spinner className="h-6 w-6" /> : null}
        {message ? <p className="text-sm text-red-600 dark:text-red-400">{message}</p> : null}
      </div>
    </AuthShell>
  );
}