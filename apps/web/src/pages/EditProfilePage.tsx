import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { updateProfileSchema, type UpdateProfileDto } from '@community/shared';
// @hookform/resolvers v3 zod v4 ile uyumsuz (ZodError fırlatıyor); proje içi resolver kullanılıyor.
import { zodResolver } from '../lib/validation';
import { Button, buttonClasses } from '../components/ui/button';
import { Avatar } from '../components/ui/avatar';
import { Field } from '../components/ui/field';
import { Badge } from '../components/ui/badge';
import { usersApi } from '../features/users/api';
import { setUserAtom, userAtom } from '../state/atoms';

type FormValues = UpdateProfileDto;

export function EditProfilePage() {
  const user = useAtomValue(userAtom);
  const setUser = useSetAtom(setUserAtom);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Yeni yuklenen avatar, kaydetmeden once onizlemede gosterilir.
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  // Araçlar formda virgülle ayrılmış metin olarak tutulur.
  const [toolsText, setToolsText] = useState('');

  const { register, handleSubmit, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(updateProfileSchema) as never,
    values: {
      name: user?.name ?? '',
      bio: user?.bio ?? '',
      siteUrl: user?.siteUrl ?? '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({ name: user.name, bio: user.bio ?? '', siteUrl: user.siteUrl ?? '' });
      setToolsText((user.tools ?? []).join(', '));
    }
  }, [user, reset]);

  const avatarUpload = useMutation({
    mutationFn: (file: File) => usersApi.uploadAvatar(file),
  });

  const save = useMutation({
    mutationFn: (values: FormValues) => usersApi.updateProfile(values),
    onSuccess: async ({ user: updated }) => {
      setUser({ ...updated });
      // Profil sayfasi ve oturum bilgisi tazelensin.
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success('Profil güncellendi');
      await navigate({ to: '/u/$username', params: { username: updated.username } });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Profil kaydedilemedi');
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    let avatarUrl: string | undefined;
    const file = fileInputRef.current?.files?.[0];
    if (file) {
      try {
        const uploaded = await avatarUpload.mutateAsync(file);
        avatarUrl = uploaded.file.url;
      } catch {
        toast.error('Avatar yüklenemedi');
        return;
      }
    }
    await save.mutateAsync({
      ...values,
      tools: parseTools(toolsText),
      ...(avatarUrl ? { avatarUrl } : {}),
    });
  });

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-xl font-semibold">Giriş gerekli</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Profilini düzenlemek için önce giriş yapmalısın.</p>
        <Link to="/login" search={{ redirect: '/settings/profile' }} className={`mt-5 ${buttonClasses({ variant: 'primary' })}`}>
          Giriş yap
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-5">
      <header>
        <h2 className="text-sm font-semibold text-ink-800 dark:text-ink-100">Profil bilgileri</h2>
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
          Görünen bilgiler herkese açık. Kullanıcı adını değiştirmek için güvenlik sayfasını kullan.
        </p>
      </header>

      <div className="flex items-center gap-4">
        <Avatar src={avatarPreview ?? user?.avatarUrl ?? undefined} name={user?.name} size="xl" />
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={avatarUpload.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            Avatar seç
          </Button>
          <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">PNG veya JPEG, en fazla 2 MB.</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          aria-label="Avatar dosyasi"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setAvatarPreview(file ? URL.createObjectURL(file) : null);
          }}
        />
      </div>

      <Field label="Ad" error={formState.errors.name} {...register('name')} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Bio
        </label>
        <textarea
          id="bio"
          rows={4}
          maxLength={500}
          aria-invalid={Boolean(formState.errors.bio)}
          className="w-full rounded-md border border-ink-300 bg-white p-3 text-sm text-ink-900 shadow-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
          {...register('bio')}
        />
        <p className="text-xs text-ink-400">Oyunlarını burada tanıtabilirsin (en fazla 500 karakter).</p>
      </div>

      <Field
        label="Bağlantı"
        placeholder="https://ornek.com"
        error={formState.errors.siteUrl}
        {...register('siteUrl')}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="tools" className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Araçlar
        </label>
        <input
          id="tools"
          value={toolsText}
          onChange={(e) => setToolsText(e.target.value)}
          placeholder="React, TypeScript, Drizzle"
          className="h-10 w-full rounded-md border border-ink-300 bg-white px-3 text-sm text-ink-900 shadow-sm dark:border-ink-700 dark:bg-ink-900 dark:text-ink-100"
        />
        <p className="text-xs text-ink-400">Virgülle ayır (en fazla 20 araç, her biri 40 karakter).</p>
        {parseTools(toolsText).length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {parseTools(toolsText).map((tool) => (
              <li key={tool.toLowerCase()}>
                <Badge variant="neutral">{tool}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" loading={save.isPending || avatarUpload.isPending}>
          Kaydet
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            reset();
            setToolsText((user.tools ?? []).join(', '));
          }}
        >
          Sıfırla
        </Button>
      </div>
    </form>
  );
}

/** Virgülle ayrılmış metni tekillestirilmiş araç listesine çevirir. */
export function parseTools(text: string): string[] {
  const unique = new Map<string, string>();
  for (const part of text.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!unique.has(key)) unique.set(key, trimmed);
  }
  return [...unique.values()].slice(0, 20);
}
