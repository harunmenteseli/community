import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { POST_CATEGORY_LABELS, POST_GAME_LABELS } from '@community/shared';
import { userAtom } from '../state/atoms';
import { postsApi } from '../features/posts/api';
import { Spinner } from '../components/ui/spinner';
import { Button } from '../components/ui/button';

export function TaslaklarPage() {
  const user = useAtomValue(userAtom);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['drafts'],
    queryFn: () => postsApi.drafts(),
    enabled: Boolean(user),
  });

  const drafts = useMemo(() => data?.posts ?? [], [data]);

  if (!user) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-xl font-semibold">Giriş gerekli</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Taslaklarını görmek için giriş yapmalısın.</p>
        <Link to="/login" className="mt-5">
          <Button variant="primary">Giriş yap</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Taslaklar</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Henüz yayınlanmamış postların.</p>
        </div>
        <Link to="/post/yeni">
          <Button variant="outline" size="sm">Yeni post</Button>
        </Link>
      </div>

      {isLoading ? <Spinner className="mx-auto mt-12" /> : null}
      {isError ? (
        <div className="mt-8 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-400">Taslaklar yüklenemedi.</p>
          <Button variant="ghost" size="sm" onClick={() => void refetch()}>
            Tekrar dene
          </Button>
        </div>
      ) : null}

      {!isLoading && !isError && drafts.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-ink-500 dark:text-ink-400">Henüz taslak yok.</p>
          <Link to="/post/yeni" className="mt-3 inline-block text-sm font-medium text-accent-600 dark:text-accent-400">
            İlk taslağını yaz
          </Link>
        </div>
      ) : null}

      {!isLoading && !isError && drafts.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {drafts.map((draft) => (
            <li key={draft.id}>
              <Link
                to="/post/yeni"
                search={{ id: draft.id }}
                className="block rounded-lg border border-ink-200 p-4 transition-colors hover:border-accent-400 dark:border-ink-800 dark:hover:border-accent-500"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-500/10 px-2.5 py-0.5 text-xs font-medium text-accent-600 dark:text-accent-400">
                    {POST_CATEGORY_LABELS[draft.category]}
                  </span>
                  {draft.game ? (
                    <span className="rounded-full border border-ink-300 px-2.5 py-0.5 text-xs font-medium text-ink-500 dark:border-ink-700 dark:text-ink-400">
                      {POST_GAME_LABELS[draft.game]}
                    </span>
                  ) : null}
                  <span className="ml-auto text-xs text-ink-400 dark:text-ink-500">
                    {new Date(draft.updatedAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-medium">{draft.title || draft.content.replace(/<[^>]*>/g, ' ').trim()}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}