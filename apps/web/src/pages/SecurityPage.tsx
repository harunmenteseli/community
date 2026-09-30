import { Link } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, Monitor, Smartphone } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { updateUsernameSchema } from '@community/shared';
import { passwordSchema } from '../features/auth/passwordSchema';
import { Button } from '../components/ui/button';
import { Spinner } from '../components/ui/spinner';
import { Field } from '../components/ui/field';
import { sessionIdAtom, userAtom, clearSessionAtom, setUserAtom } from '../state/atoms';
import { authApi } from '../features/auth/api';
import { usersApi } from '../features/users/api';
import { ApiError } from '../lib/api';
import { zodResolver } from '../lib/validation';
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
  const queryClient = useQueryClient();
  const clearSession = useSetAtom(clearSessionAtom);
  const setUser = useSetAtom(setUserAtom);

  const sessionsQuery = useQuery({
    queryKey: ['auth', 'sessions'],
    queryFn: async () => (await authApi.sessions()).sessions,
    enabled: Boolean(user),
  });

  const revoke = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: (_data, sessionId) => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toast.success('Oturum kapatıldı');
      // Kapatilan oturum bu tarayiciya aitse yerel oturumu da temizle.
      if (sessionId === currentSessionId) clearSession();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Oturum kapatılamadı');
    },
  });

  const revokeAll = useMutation({
    mutationFn: () => authApi.revokeAllSessions(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toast.success('Diğer oturumlar kapatıldı');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Oturumlar kapatılamadı');
    },
  });

  const usernameForm = useForm<{ username: string }>({
    resolver: zodResolver(updateUsernameSchema) as never,
    defaultValues: { username: '' },
  });

  const changeUsername = useMutation({
    mutationFn: (value: string) => usersApi.changeUsername(value),
    onSuccess: async ({ user: updated }) => {
      setUser({ ...updated });
      usernameForm.reset({ username: '' });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(`Kullanıcı adın @${updated.username} oldu`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Kullanıcı adı değiştirilemedi');
    },
  });

  const changePassword = useMutation({
    mutationFn: (values: { currentPassword: string; newPassword: string }) =>
      usersApi.changePassword(values.currentPassword, values.newPassword),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['auth', 'sessions'] });
      toast.success('Şifren güncellendi, diğer oturumlar kapandı');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Şifre değiştirilemedi');
    },
  });

  type PasswordValues = { currentPassword: string; newPassword: string; confirmPassword: string };

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema) as never,
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-xl font-semibold">Giriş gerekli</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Oturumlarını görmek için önce giriş yapmalısın.</p>
        <Link to="/login" search={{ redirect: '/settings/security' }} className="mt-5">
          <Button variant="primary">Giriş yap</Button>
        </Link>
      </div>
    );
  }

  const sessions = sessionsQuery.data;

  return (
    <div className="container-page mx-auto max-w-3xl space-y-8 py-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Şifre &amp; Güvenlik</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Kullanıcı adını, şifreni ve aktif oturumlarını yönet.
        </p>
      </div>

      <section className="rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">Kullanıcı adı</h2>
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          Kullanıcı adın profil adresini belirler: <span className="font-mono">/u/{user.username}</span>
        </p>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start"
          onSubmit={usernameForm.handleSubmit(({ username: value }) => changeUsername.mutate(value))}
        >
          <div className="flex-1">
            <Field
              label="Yeni kullanıcı adı"
              placeholder="kullanici_adi"
              autoComplete="username"
              error={usernameForm.formState.errors.username}
              {...usernameForm.register('username')}
            />
          </div>
          <Button type="submit" className="sm:mt-7" loading={changeUsername.isPending}>
            Değiştir
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
        <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">Şifre</h2>
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          Şifreni değiştirdiğinde diğer tüm oturumların kapanır, bu cihaz açık kalır.
        </p>
        <form
          className="mt-3 space-y-3"
          onSubmit={passwordForm.handleSubmit(({ currentPassword, newPassword }) =>
            changePassword.mutate({ currentPassword, newPassword }),
          )}
        >
          <Field
            label="Mevcut şifre"
            type="password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.currentPassword}
            {...passwordForm.register('currentPassword')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Yeni şifre"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.newPassword}
              {...passwordForm.register('newPassword')}
            />
            <Field
              label="Yeni şifre (tekrar)"
              type="password"
              autoComplete="new-password"
              error={passwordForm.formState.errors.confirmPassword}
              {...passwordForm.register('confirmPassword')}
            />
          </div>
          <Button type="submit" loading={changePassword.isPending}>
            Şifreyi güncelle
          </Button>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-ink-500 dark:text-ink-300">Aktif oturumlar ({sessions?.length ?? 0})</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => revokeAll.mutate()}
            disabled={revokeAll.isPending || (sessions?.length ?? 0) <= 1}
          >
            {revokeAll.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Diğerlerini kapat
          </Button>
        </div>

        {sessionsQuery.isError ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {sessionsQuery.error instanceof ApiError ? sessionsQuery.error.message : 'Oturumlar yüklenemedi'}
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
                    disabled={revoke.isPending || isCurrent}
                    onClick={() => revoke.mutate(session.id)}
                  >
                    {revoke.isPending && revoke.variables === session.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">{isCurrent ? 'Bu oturum' : 'Kapat'}</span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
