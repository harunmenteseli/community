import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { MessageSquarePlus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import { userAtom } from '../state/atoms';
import { FeedbackModal } from '../features/launchpad/FeedbackModal';
import { ReportButton } from '../features/reports/ReportButton';
import { launchpadApi, type LaunchpadProject, type LaunchpadSort } from '../features/launchpad/api';

const PAGE_SIZE = 12;

const SORTS: { value: LaunchpadSort; label: string }[] = [
  { value: 'yeni', label: 'Yeni' },
  { value: 'puan', label: 'Popüler' },
];

export function CareerShowcasePage() {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const [sort, setSort] = useState<LaunchpadSort>('yeni');
  const [feedbackFor, setFeedbackFor] = useState<LaunchpadProject | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const query = useInfiniteQuery({
    queryKey: ['launchpad', 'list', sort],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => launchpadApi.list({ sort, cursor: pageParam, limit: PAGE_SIZE }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const projects = useMemo(() => query.data?.pages.flatMap((page) => page.projects) ?? [], [query.data]);

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  const launchToggle = useMutation({
    mutationFn: ({ id, launched }: { id: string; launched: boolean }) =>
      launched ? launchpadApi.unlaunch(id) : launchpadApi.launch(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['launchpad'] });
      void queryClient.invalidateQueries({ queryKey: ['my-projects'] });
      void queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Yayin durumu guncellendi');
    },
    onError: (err) => toast.error(err.message || 'Guncellenemedi'),
  });

  return (
    <div className="container-page py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Kariyer Vitrini</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Topluluk yayınladığı işleri gör, puanla ve yorumla.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-800" role="tablist" aria-label="Sıralama">
          {SORTS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={sort === item.value}
              onClick={() => setSort(item.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                sort === item.value
                  ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                  : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {query.isPending ? (
        <ul className="grid gap-4 sm:grid-cols-2" aria-label="Vitrin kayitlari yukleniyor">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
              <Skeleton lines={3} />
            </li>
          ))}
        </ul>
      ) : null}

      {query.isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-400">Vitrin kayıtları yüklenemedi.</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Tekrar dene
          </Button>
        </div>
      ) : null}

      {!query.isPending && !query.isError && projects.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-400">Henüz yayınlanmış vitrin kaydı yok.</p>
          {user ? (
            <Link to="/vitrin" className="mt-2 inline-block text-sm font-medium text-accent-600 hover:underline dark:text-accent-400">
              Vitrin kayıtlarını yönet
            </Link>
          ) : null}
        </div>
      ) : null}

      {projects.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => {
            const isOwner = Boolean(user && project.owner?.id === user.id);
            const cover = project.images.find((image) => image.type === 'cover');

            return (
              <li key={project.id} className="flex flex-col overflow-hidden rounded-xl border border-ink-200 dark:border-ink-800">
                {cover ? <img src={cover.url} alt="" className="h-28 w-full object-cover" loading="lazy" /> : null}

                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex items-start gap-3">
                    {project.logoUrl ? (
                      <img src={project.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" loading="lazy" />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold">{project.name}</h2>
                      <p className="text-xs text-ink-500 dark:text-ink-400">{project.category}</p>
                    </div>
                    <p
                      className="flex shrink-0 items-center gap-1 text-sm font-semibold"
                      aria-label={`Ortalama puan ${project.avgRating ?? 0} / 10`}
                    >
                      <Star className="h-4 w-4 text-amber-500" fill="currentColor" aria-hidden />
                      {((project.avgRating ?? 0) / 10).toFixed(1)}
                      <span className="text-xs font-normal text-ink-500 dark:text-ink-400">
                        ({project.ratingCount})
                      </span>
                    </p>
                  </div>

                  {project.description ? (
                    <p className="line-clamp-3 text-sm text-ink-600 dark:text-ink-300">{project.description}</p>
                  ) : null}

                  {(project.buildWith ?? []).length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Kullanilan teknolojiler">
                      {(project.buildWith ?? []).map((tech) => (
                        <li key={tech} className="rounded-full bg-ink-100 px-2 py-0.5 text-xs dark:bg-ink-800">
                          {tech}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {project.owner ? (
                    <Link
                      to="/u/$username"
                      params={{ username: project.owner.username }}
                      className="flex items-center gap-2 text-xs text-ink-500 hover:underline dark:text-ink-400"
                    >
                      <Avatar src={project.owner.avatarUrl ?? undefined} name={project.owner.name} size="sm" />
                      {project.owner.name}
                    </Link>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-xs font-medium text-accent-600 hover:underline dark:text-accent-400"
                    >
                      Projeyi aç
                    </a>
                    {isOwner ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={launchToggle.isPending}
                        onClick={() => launchToggle.mutate({ id: project.id, launched: project.launched })}
                      >
                        Vitrinden kaldır
                      </Button>
                    ) : (
                      <ReportButton
                        targetType="project"
                        targetId={project.id}
                        subject={project.name}
                        className="px-2"
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="ml-auto"
                      onClick={() => setFeedbackFor(project)}
                    >
                      <MessageSquarePlus className="h-4 w-4" aria-hidden />
                      Yorum & Puan
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div ref={sentinelRef} aria-hidden className="h-px" />

      {query.isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : null}

      {query.hasNextPage && !query.isFetchingNextPage ? (
        <div className="flex justify-center py-4">
          <Button variant="outline" size="sm" onClick={loadMore}>
            Daha fazla göster
          </Button>
        </div>
      ) : null}

      {feedbackFor ? (
        <FeedbackModal project={feedbackFor} open onClose={() => setFeedbackFor(null)} />
      ) : null}
    </div>
  );
}
