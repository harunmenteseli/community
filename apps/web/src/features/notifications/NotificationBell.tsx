import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { Bell } from 'lucide-react';
import { userAtom } from '../../state/atoms';
import { notificationsApi } from './api';
import { UNREAD_KEY } from './useRealtimeNotifications';
import { cn } from '../../lib/cn';

/** Header'daki zil rozeti: okunmamis sayaci socket ile canli guncellenir. */
export function NotificationBell() {
  const user = useAtomValue(userAtom);

  // Sayfa ilk yuklendiginde HTTP'den gelir, sonra socket 'notifications:unread'
  // ve 'notification:new' olaylariyla guncellenir.
  const unread = useQuery({
    queryKey: UNREAD_KEY,
    queryFn: () => notificationsApi.unreadCount().then((res) => res.count),
    enabled: Boolean(user),
    staleTime: 30_000,
  });

  if (!user) return null;
  const count = typeof unread.data === 'number' ? unread.data : 0;

  return (
    <Link
      to="/bildirimler"
      className="relative flex h-8 w-8 items-center justify-center rounded-md text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
    >
      <Bell className="h-4 w-4" aria-hidden />
      <span className="sr-only">
        {count > 0 ? `${count} okunmamış bildirim` : 'Bildirimler'}
      </span>
      {count > 0 ? (
        <span
          aria-hidden
          data-testid="notification-badge"
          className={cn(
            'absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
