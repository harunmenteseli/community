import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationSettingsDto } from '@community/shared';
import { Switch } from '../components/ui/switch';
import { Spinner } from '../components/ui/spinner';
import { notificationsApi } from '../features/notifications/api';
import { ApiError } from '../lib/api';
import { toast } from 'sonner';

/** Tercih anahtarları ve kullanıcıya gösterilen açıklamaları. */
const PREFERENCES: { key: keyof NotificationSettingsDto; label: string; description: string }[] = [
  { key: 'follow', label: 'Takip', description: 'Birisi seni takip etmeye başladığında.' },
  { key: 'comment', label: 'Yorum', description: 'Postlarına yorum yapıldığında.' },
  { key: 'reply', label: 'Yanıt', description: 'Yorumlarına yanıt verildiğinde.' },
  { key: 'mention', label: 'Bahsedilme', description: 'Bir gönderide senden bahsedildiğinde.' },
  { key: 'like', label: 'Beğeni', description: 'Gönderilerin ve yorumların beğenildiğinde.' },
  { key: 'launch', label: 'Vitrin', description: 'Vitrinindeki bir kayıt yayınlandığında.' },
  { key: 'weeklyDigest', label: 'Haftalık özet', description: 'Haftalık aktivite özeti e-postan.' },
];

export function NotificationSettingsPage() {
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['notifications', 'settings'],
    queryFn: async () => (await notificationsApi.settings()).settings,
  });

  const save = useMutation({
    mutationFn: (next: NotificationSettingsDto) => notificationsApi.updateSettings(next),
    onSuccess: ({ settings }) => {
      queryClient.setQueryData(['notifications', 'settings'], settings);
      toast.success('Bildirim tercihleri kaydedildi');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Tercihler kaydedilemedi');
    },
  });

  const settings = settingsQuery.data;

  const toggle = (key: keyof NotificationSettingsDto, value: boolean) => {
    if (!settings) return;
    // Anında geri çevrilebilmesi için iyimser güncelleme.
    queryClient.setQueryData(['notifications', 'settings'], { ...settings, [key]: value });
    save.mutate({ ...settings, [key]: value });
  };

  if (!settings) {
    return (
      <div className="py-16 text-center">
        <Spinner className="mx-auto h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Bildirim tercihleri</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Hangi bildirimleri almak istediğini seç. Değişiklikler anında kaydedilir.
        </p>
      </header>

      <div className="divide-y divide-ink-200 rounded-xl border border-ink-200 bg-white px-5 dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900">
        {PREFERENCES.map((preference) => (
          <Switch
            key={preference.key}
            id={`pref-${preference.key}`}
            checked={settings[preference.key]}
            onCheckedChange={(value) => toggle(preference.key, value)}
            label={preference.label}
            description={preference.description}
            disabled={save.isPending}
          />
        ))}
      </div>
    </div>
  );
}
