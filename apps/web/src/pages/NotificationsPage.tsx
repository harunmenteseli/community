import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import { userAtom } from '../state/atoms';
import { cn } from '../lib/cn';
import { notificationsApi, type NotificationFilter } from '../features/notifications/api';
import { notificationText } from '../features/notifications/format';
import { NOTIFICATIONS_KEY, UNREAD_KEY } from '../features/notifications/useRealtimeNotifications';

const FILTERS: { value: NotificationFilter; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'unread', label: 'Okunmamış' },
];

export function NotificationsPage() {
  const user = useAtomValue(userAtom);
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: [...NOTIFICATIONS_KEY, 'list', filter],
    queryFn: ({ pageParam }) => notificationsApi.list({ cursor: pageParam as string | undefined, filter }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(user),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_KEY });
    },
    onError: () => toast.error('Bildirim okunamadı'),
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData(UNREAD_KEY, 0);
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    },
    onError: () => toast.error('Bildirimler işaretlenemedi'),
  });

  if (!user) {
    return (
      <div className="container-page mx-auto max-w-2xl py-16 text-center">
        <p className="text-sm text-ink-500 dark:text-ink-400">Bildirimlerini görmek için giriş yapmalısın.</p>
        <Link to="/login" search={{ redirect: '/bildirimler' }} className="mt-3 inline-block text-sm font-medium text-accent-600 hover:underline dark:text-accent-400">
          Giriş yap
        </Link>
      </div>
    );
  }

  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="container-page mx-auto max-w-2xl py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">Bildirimler</h1>
        <Button
          variant="outline"
          size="sm"
          loading={markAll.isPending}
          onClick={() => markAll.mutate()}
          disabled={items.length === 0}
        >
          <CheckCheck className="h-4 w-4" aria-hidden />
          Tümünü okundu işaretle
        </Button>
      </div>

      <div
        role="tablist"
        aria-label="Bildirim filtresi"
        className="mt-4 flex items-center gap-1 rounded-lg border border-ink-200 p-1 dark:border-ink-800"
      >
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={cn(
              'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
              filter === item.value
                ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900'
                : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {query.isPending ? <Skeleton lines={4} className="mt-4" /> : null}

      {!query.isPending && items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-500 dark:text-ink-400">
          {filter === 'unread' ? 'Okunmamış bildirimin yok.' : 'Henüz bildirimin yok.'}
        </p>
      ) : null}

      {items.length > 0 ? (
        <ul className="mt-4 divide-y divide-ink-200 rounded-xl border border-ink-200 dark:divide-ink-800 dark:border-ink-800">
          {items.map((item) => {
            const { text, href } = notificationText(item);
            return (
              <li key={item.id}>
                <div
                  className={cn(
                    'flex items-start gap-3 p-3',
                    item.readAt === null && 'bg-accent-50/60 dark:bg-accent-900/10',
                  )}
                >
                  <Avatar
                    src={item.actor?.avatarUrl ?? undefined}
                    name={item.actor?.name ?? 'Sistem'}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link
                        to={href}
                        onClick={() => {
                          if (item.readAt === null) markRead.mutate(item.id);
                        }}
                        className="text-sm font-medium hover:underline"
                      >
                        {text}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (item.readAt === null) markRead.mutate(item.id);
                        }}
                        className="text-left text-sm font-medium"
                      >
                        {text}
                      </button>
                    )}
                    <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                      {new Date(item.createdAt).toLocaleString('tr-TR')}
                    </p>
                  </div>
                  {item.readAt === null ? (
                    <button
                      type="button"
                      aria-label={`Okundu işaretle: ${text}`}
                      className="shrink-0 text-xs text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-100"
                      onClick={() => markRead.mutate(item.id)}
                    >
                      Okundu
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {query.hasNextPage ? (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            loading={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Daha fazla
          </Button>
        </div>
      ) : null}

      {query.isFetchingNextPage ? (
        <div className="flex justify-center py-3">
          <Spinner />
        </div>
      ) : null}
    </div>
  );
}
