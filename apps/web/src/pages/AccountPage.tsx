import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useSetAtom } from 'jotai';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AccountInfo } from '@community/shared';
import { Button } from '../components/ui/button';
import { Field } from '../components/ui/field';
import { Modal } from '../components/ui/modal';
import { Spinner } from '../components/ui/spinner';
import { Badge } from '../components/ui/badge';
import { usersApi } from '../features/users/api';
import { ApiError } from '../lib/api';
import { clearSessionAtom } from '../state/atoms';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'long' }).format(new Date(value));
}

export function AccountPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const clearSession = useSetAtom(clearSessionAtom);

  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const accountQuery = useQuery({
    queryKey: ['auth', 'account'],
    queryFn: async () => (await usersApi.account()).account,
  });

  const remove = useMutation({
    mutationFn: () => usersApi.deleteAccount(password, confirmText),
    onSuccess: () => {
      // Hesap gitti: yerel oturum ve onbellek temizlenmeli.
      clearSession();
      queryClient.clear();
      toast.success('Hesabın silindi');
      void navigate({ to: '/' });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Hesap silinemedi');
    },
  });

  const account = accountQuery.data;

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Hesap</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Hesap bilgilerin ve hesabını kalıcı olarak silme seçeneği.
        </p>
      </header>

      {!account ? (
        <div className="py-16 text-center">
          <Spinner className="mx-auto h-6 w-6" />
        </div>
      ) : (
        <>
          <dl className="divide-y divide-ink-200 rounded-xl border border-ink-200 bg-white dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900">
            <Row label="Kullanıcı adı" value={`@${account.username}`} />
            <Row label="Ad" value={account.name} />
            <Row
              label="E-posta"
              value={
                <span className="inline-flex items-center gap-2">
                  {account.email}
                  {account.emailVerifiedAt ? (
                    <Badge variant="success">Doğrulanmış</Badge>
                  ) : (
                    <Badge variant="warning">Doğrulanmadı</Badge>
                  )}
                </span>
              }
            />
            <Row label="Kayıt tarihi" value={formatDate(account.createdAt)} />
          </dl>

          <section className="rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/60 dark:bg-red-950/20">
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-200">Hesabı sil</h2>
            <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
              Hesabın, gönderilerin, yorumların, takiplerin ve bildirimlerin kalıcı olarak silinir. Bu işlem geri
              alınamaz.
            </p>
            <Button variant="destructive" size="sm" className="mt-3" onClick={() => setOpen(true)}>
              <Trash2 className="h-4 w-4" />
              Hesabı sil
            </Button>
          </section>
        </>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Hesabını sil"
        description="Bu işlem geri alınamaz. Onaylamak için şifreni ve kullanıcı adını yaz."
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              size="sm"
              loading={remove.isPending}
              // İki onay da dolmadan gonder butonu aktif olmaz.
              disabled={!password || !confirmText || confirmText !== account?.username}
              onClick={() => remove.mutate()}
            >
              Kalıcı olarak sil
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field
            id="delete-password"
            name="password"
            label="Şifre"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field
            id="delete-confirm"
            name="confirmText"
            label={`"${account?.username}" yaz`}
            placeholder={account?.username}
            autoComplete="off"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
          {confirmText && confirmText !== account?.username ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              Kullanıcı adı eşleşmiyor.
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-sm text-ink-500 dark:text-ink-400">{label}</dt>
      <dd className="text-sm font-medium text-ink-800 dark:text-ink-100">{value}</dd>
    </div>
  );
}

export type { AccountInfo };
