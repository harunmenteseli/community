import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { tokenAtom } from '../../state/atoms';
import { notificationsApi, type AppNotification } from './api';
import { notificationText } from './format';

export const UNREAD_KEY = ['notifications', 'unread'] as const;
export const NOTIFICATIONS_KEY = ['notifications'] as const;

let socket: Socket | null = null;

/**
 * Socket adresi her zaman ayni origin: gelistirmede vite proxy /socket.io'yu
 * API'ye yonlendiriyor, uretimde de reverse proxy ayni yolu actigi icin ayri
 * bir adres yapilandirmaya gerek yok.
 */
function socketUrl(): string {
  return window.location.origin;
}

function toNotification(raw: unknown): AppNotification | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const candidate = raw as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || typeof candidate.type !== 'string') return null;
  return candidate as unknown as AppNotification;
}

/**
 * Socket.IO bildirimlerini React Query cache'ine yazar:
 *  - `notification:new`   -> listeye ekler, okunmamis sayaci artirir, toaster gosterir
 *  - `notifications:unread` -> okunmamis sayacini sunucudan gelen degerle hizalar
 */
/**
 * Baglanti durumu globalde birakiliyor: e2e testleri canli bildirimi
 * deterministik test edebilmek icin soketin acilmasini bekleyebiliyor
 * (olay, soket bagli degilken gonderilirse sessizce kacirilir).
 */
declare global {
  interface Window {
    __communityRealtime?: 'connected' | 'closed';
  }
}

export function useRealtimeNotifications(): void {
  const token = useAtomValue(tokenAtom);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      socket?.disconnect();
      socket = null;
      delete window.__communityRealtime;
      return;
    }

    socket?.disconnect();
    const client = io(socketUrl(), {
      // Sunucu handshake'te "Bearer <token>" bekliyor (HTTP auth header'iyla
      // ayni bicim); localStorage'daki token prefixesiz saklaniyor.
      auth: { token: `Bearer ${token}` },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socket = client;

    client.on('connect', () => {
      window.__communityRealtime = 'connected';
    });
    client.on('disconnect', () => {
      window.__communityRealtime = 'closed';
    });

    client.on('notifications:unread', (payload: { count?: number }) => {
      const count = typeof payload?.count === 'number' ? payload.count : 0;
      queryClient.setQueryData(UNREAD_KEY, count);
    });

    client.on('notification:new', (raw: unknown) => {
      const item = toNotification(raw);
      if (!item) return;

      queryClient.setQueryData<number>(UNREAD_KEY, (old) => (typeof old === 'number' ? old + 1 : 1));
      queryClient.setQueriesData(
        { queryKey: NOTIFICATIONS_KEY },
        (old: unknown) => prependNotification(old, item),
      );
      toast(notificationText(item).text);
    });

    return () => {
      client.removeAllListeners();
      client.disconnect();
      delete window.__communityRealtime;
      if (socket === client) socket = null;
    };
  }, [token, queryClient]);
}

/**
 * Bildirim cache'ini guncelleyerek yeni bildirimi basa ekler. Okunmamis filtresi
 * aktifse okunmus bildirim listeye girmez.
 */
export function prependNotification(old: unknown, item: AppNotification): unknown {
  const pages = (old as { pages?: unknown[] } | undefined)?.pages;
  if (!Array.isArray(pages) || pages.length === 0) return old;

  const first = pages[0] as { items?: AppNotification[] };
  if (!Array.isArray(first.items)) return old;
  if (first.items.some((existing) => existing.id === item.id)) return old;

  return {
    ...(old as object),
    pages: [
      { ...first, items: [item, ...first.items] },
      ...pages.slice(1),
    ],
  };
}

/** Testler ve yeniden baglanma icin: aktif soketi dondurur. */
export function activeSocket(): Socket | null {
  return socket;
}

export { notificationsApi };
