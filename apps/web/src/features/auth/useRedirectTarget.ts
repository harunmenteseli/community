import { useLocation } from '@tanstack/react-router';

/**
 * Giris/kayit sonrasi nereye donulecegini cozer.
 *
 * `?redirect=/post/yeni` gibi bir hedef varsa ona gider, yoksa feed'e.
 * Disaridan gelen degerler mutlaka site ici yol olmali: "//evil.com" gibi
 * degerler open redirect'e donusebilir.
 */
export function useRedirectTarget(fallback = '/feed'): string {
  const location = useLocation();
  const raw = new URLSearchParams(location.searchStr ?? '').get('redirect');

  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
  return raw;
}
