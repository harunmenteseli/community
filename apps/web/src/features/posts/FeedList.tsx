import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useInfiniteQuery } from '@tanstack/react-query';
import type { PostCategory, PostGame } from '@community/shared';
import { userAtom } from '../../state/atoms';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Spinner } from '../../components/ui/spinner';
import { feedApi, type FeedFilter } from './feedApi';
import { FeedFiltersBar } from './FeedFiltersBar';
import { PostCard } from './PostCard';

const PAGE_SIZE = 20;

interface FeedState {
  filter: FeedFilter;
  category: PostCategory | null;
  game: PostGame | null;
}

export interface FeedListProps {
  /** Baslangic filtresi; cagiran taraf URL ile gelen degeri verebilir. */
  initialFilter?: FeedFilter;
}

export function FeedList({ initialFilter = 'yeni' }: FeedListProps) {
  const user = useAtomValue(userAtom);

  const [state, setState] = useState<FeedState>({ filter: initialFilter, category: null, game: null });
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { filter, category, game } = state;

  const query = useInfiniteQuery({
    queryKey: ['feed', filter, category, game],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => feedApi.list({ filter, cursor: pageParam, limit: PAGE_SIZE, category, game }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const posts = useMemo(() => query.data?.pages.flatMap((page) => page.posts) ?? [], [query.data]);

  // "takip" filtresi oturum yoksa anlamsiz; giris yapilmis hesapla gecis.
  useEffect(() => {
    if (filter === 'takip' && !user) setState((s) => ({ ...s, filter: 'yeni' }));
  }, [filter, user]);

  // Infinite scroll: liste sonuna gelince sonraki sayfayi iste.
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

  return (
    <div className="flex flex-col gap-4">
      <FeedFiltersBar
        filter={filter}
        category={category}
        game={game}
        onFilterChange={(next) => setState((s) => ({ ...s, filter: next }))}
        onCategoryChange={(next) => setState((s) => ({ ...s, category: next }))}
        onGameChange={(next) => setState((s) => ({ ...s, game: next }))}
      />

      {query.isPending ? (
        <ul className="flex flex-col gap-3" aria-label="Postlar yukleniyor">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
              <Skeleton lines={3} />
            </li>
          ))}
        </ul>
      ) : null}

      {query.isError ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-400">Postlar yüklenemedi.</p>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Tekrar dene
          </Button>
        </div>
      ) : null}

      {!query.isPending && !query.isError && posts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-400">
            {filter === 'takip'
              ? 'Takip ettiğin kimse yok. Birini takip et, postları burada gör.'
              : 'Bu filtrede henüz post yok.'}
          </p>
        </div>
      ) : null}

      {posts.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
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
    </div>
  );
}
