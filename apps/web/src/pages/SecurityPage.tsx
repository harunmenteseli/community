import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { Loader2, Trash2, Monitor, Smartphone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import { sessionIdAtom, userAtom } from '../state/atoms';
import { authApi, type SessionInfo } from '../features/auth/api';
import { ApiError } from '../lib/api';
import { toast } from 'sonner';

function formatDevice(userAgent: string | null): string {
  if (!userAgent) return 'Bilinmeyen cihaz';
  const ua = userAgent.toLowerCase();
  if (ua.includes('electron') || ua.includes('chrome/') || ua.includes('firefox/') || ua.includes('safari')) {
    if (/android/i.test(ua)) return 'Android tarayıcı';
    if (/iphone|ipad|ipod/i.test(ua)) return 'iOS tarayıcı';
    if (/windows/i.test(ua)) return 'Windows tarayıcı';
    if (/macintosh|mac os/i.test(ua)) return 'macOS tarayıcı';
    if (/linux/i.test(ua)) return 'Linux tarayıcı';
    return 'Tarayıcı';
  }
  return userAgent.slice(0, 60) || 'Bilinmeyen cihaz';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function SecurityPage() {
  const user = useAtomValue(userAtom);
  const currentSessionId = useAtomValue(sessionIdAtom);
  const [sessions, setSessions] = useState<SessionInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { sessions: list } = await authApi.sessions();
      setSessions(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Oturumlar yüklenemedi');
    }
  }, []);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-xl font-semibold">Giriş gerekli</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Oturumlarını görmek için önce giriş yapmalısın.</p>
        <Link to="/login" className="mt-5">
          <Button variant="primary">Giriş yap</Button>
        </Link>
      </div>
    );
  }

  const onRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    try {
      await authApi.revokeSession(sessionId);
      setSessions((list) => (list ? list.filter((s) => s.id !== sessionId) : list));
      toast.success('Oturum kapatıldı');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Oturum kapatılamadı');
    } finally {
      setRevoking(null);
    }
  };

  const onRevokeAll = async () => {
    setRevokingAll(true);
    try {
      await authApi.revokeAllSessions();
      setSessions([]);
      toast.success('Diğer oturumlar kapatıldı');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Oturumlar kapatılamadı');
    } finally {
      setRevokingAll(false);
    }
  };

  return (
    <div className="container-page mx-auto max-w-3xl py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Şifre &amp; Güvenlik</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Aktif oturumlarını görüntüle ve yönet.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-ink-500 dark:text-ink-300">Aktif oturumlar ({sessions?.length ?? 0})</h2>
        <Button variant="outline" size="sm" onClick={onRevokeAll} disabled={revokingAll || (sessions?.length ?? 0) <= 1}>
          {revokingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Diğerlerini kapat
        </Button>
      </div>

      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      {!sessions ? (
        <div className="py-10 text-center">
          <Spinner className="mx-auto h-6 w-6" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-500 dark:text-ink-400">Aktif oturum yok.</p>
      ) : (
        <ul className="divide-y divide-ink-200 rounded-xl border border-ink-200 bg-white dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900">
          {sessions.map((session) => {
            const isCurrent = session.id === currentSessionId;
            return (
              <li key={session.id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <span className="hidden text-ink-400 sm:inline">
                    {/android|iphone|ipad|ipod/i.test(session.userAgent ?? '') ? (
                      <Smartphone className="h-5 w-5" />
                    ) : (
                      <Monitor className="h-5 w-5" />
                    )}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {formatDevice(session.userAgent)}
                      {isCurrent ? (
                        <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">
                          Bu cihaz
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {session.ip ?? 'IP bilinmiyor'} · {formatDate(session.createdAt)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={revoking === session.id || isCurrent}
                  onClick={() => onRevoke(session.id)}
                >
                  {revoking === session.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  <span className="hidden sm:inline">{isCurrent ? 'Bu oturum' : 'Kapat'}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}