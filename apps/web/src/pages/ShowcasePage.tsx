import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonClasses } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { userAtom } from '../state/atoms';
import { projectsApi } from '../features/projects/api';

export function ShowcasePage() {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<string | null>(null);

  const mine = useQuery({
    queryKey: ['my-projects'],
    queryFn: () => projectsApi.mine(),
    enabled: Boolean(user),
  });

  const remove = useMutation({
    mutationFn: (id: string) => projectsApi.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      void queryClient.invalidateQueries({ queryKey: ['launchpad'] });
      setConfirming(null);
      toast.success('Vitrin kaydı silindi');
    },
    onError: (err) => toast.error(err.message || 'Silinemedi'),
  });

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-xl font-semibold">Giriş gerekli</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Vitrin kayıtlarını görmek için giriş yapmalısın.</p>
        <Link to="/login" search={{ redirect: '/vitrin' }} className={`mt-5 ${buttonClasses({ variant: 'primary' })}`}>
          Giriş yap
        </Link>
      </div>
    );
  }

  const projects = mine.data?.projects ?? [];

  return (
    <div className="container-page mx-auto max-w-3xl py-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vitrin kayıtlarım</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Kariyer Vitrini'nde ve profilinde görünecek işlerini yönet.
          </p>
        </div>
        <Link to="/vitrin/yeni" className={buttonClasses({ variant: 'primary', size: 'sm' })}>
          Vitrin kaydı ekle
        </Link>
      </header>

      {mine.isPending ? <Skeleton lines={4} /> : null}

      {mine.isError ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-400">Vitrin kayıtları yüklenemedi.</p>
          <Button variant="outline" size="sm" onClick={() => void mine.refetch()}>
            Tekrar dene
          </Button>
        </div>
      ) : null}

      {!mine.isPending && !mine.isError && projects.length === 0 ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">Henüz vitrin kaydın yok.</p>
      ) : null}

      {projects.length > 0 ? (
        <ul className="space-y-3">
          {projects.map((project) => (
            <li key={project.id} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
              <div className="flex items-start gap-3">
                {project.logoUrl ? (
                  <img src={project.logoUrl} alt="" className="h-10 w-10 rounded object-cover" loading="lazy" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{project.name}</p>
                  <p className="truncate text-xs text-ink-500 dark:text-ink-400">{project.url}</p>
                  <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                    {[
                      project.category,
                      (project.buildWith ?? []).join(', '),
                      project.launched ? 'yayında' : 'taslak',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    to="/vitrin/$projectId"
                    params={{ projectId: project.id }}
                    aria-label={`${project.name} kaydını düzenle`}
                    className={buttonClasses({ variant: 'outline', size: 'icon-sm' })}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Link>
                  <Button
                    variant="destructive"
                    size="icon-sm"
                    aria-label={`${project.name} kaydını sil`}
                    onClick={() => setConfirming(project.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>

              {confirming === project.id ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-ink-50 p-3 dark:bg-ink-800/60">
                  <p className="text-sm">Bu kayıt silinsin mi?</p>
                  <Button
                    variant="destructive"
                    size="sm"
                    loading={remove.isPending}
                    onClick={() => remove.mutate(project.id)}
                  >
                    Evet, sil
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                    Vazgeç
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
