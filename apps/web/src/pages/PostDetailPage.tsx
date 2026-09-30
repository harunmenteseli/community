import { Link, useParams } from '@tanstack/react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { POST_CATEGORY_LABELS, POST_GAME_LABELS } from '@community/shared';
import { userAtom } from '../state/atoms';
import { Avatar } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Spinner } from '../components/ui/spinner';
import { cn } from '../lib/cn';
import { postsApi } from '../features/posts/api';
import { CommentSection } from '../features/posts/CommentSection';
import { PollBox } from '../features/posts/PollBox';
import { timeAgo } from '../features/posts/PostCard';

export function PostDetailPage() {
  const { id } = useParams({ from: '/post/$id' });
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.get(id),
  });

  const post = query.data?.post ?? null;

  const remove = useMutation({
    mutationFn: () => postsApi.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void window.location.assign('/feed');
    },
  });

  if (query.isPending) {
    return (
      <div className="container-page py-8">
        <div className="mx-auto max-w-2xl rounded-xl border border-ink-200 p-4 dark:border-ink-800">
          <Skeleton lines={6} />
        </div>
      </div>
    );
  }

  if (query.isError || !post) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <h1 className="text-xl font-semibold">Post bulunamadı</h1>
        <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">Bu post silinmiş veya gizlenmiş olabilir.</p>
        <Link to="/feed" className="mt-5">
          <Button variant="outline">Feed&apos;e dön</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <article className="mx-auto flex max-w-2xl flex-col gap-4">
        <header className="rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900/40">
          <div className="flex items-start gap-3">
            <Avatar src={post.author.avatarUrl ?? undefined} name={post.author.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="truncate text-sm font-semibold">{post.author.name}</span>
                <span className="truncate text-sm text-ink-500 dark:text-ink-400">@{post.author.username}</span>
                <span aria-hidden className="text-ink-400">·</span>
                <time dateTime={post.createdAt} className="text-xs text-ink-500 dark:text-ink-400">
                  {timeAgo(post.createdAt)}
                </time>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="accent">{POST_CATEGORY_LABELS[post.category]}</Badge>
                {post.game ? <Badge>{POST_GAME_LABELS[post.game]}</Badge> : null}
              </div>
            </div>
            {user?.id === post.author.id ? (
              <Button variant="ghost" size="sm" onClick={() => remove.mutate()} disabled={remove.isPending}>
                Sil
              </Button>
            ) : null}
          </div>

          {post.title ? <h1 className="mt-4 text-xl font-semibold leading-snug tracking-tight">{post.title}</h1> : null}

          <div
            className={cn('mt-3 whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200', !post.title && 'mt-4')}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {post.images.length > 0 ? (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {post.images.map((image) => (
                <li key={image.url}>
                  <img
                    src={image.url}
                    alt={image.alt ?? ''}
                    loading="lazy"
                    className="w-full rounded-lg object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {post.poll ? <PollBox postId={post.id} poll={post.poll} /> : null}

          <footer className="mt-4 flex items-center gap-4 text-sm text-ink-500 dark:text-ink-400">
            {/* Begenme/kaydetme butonlari #6 kapsaminda; simdilik yalnizca sayaclar. */}
            <span className="flex items-center gap-1.5" aria-label="Begenme sayisi">
              <span aria-hidden>{post.likedByMe ? '♥' : '♡'}</span>
              {post.likeCount > 0 ? post.likeCount : 'Beğen'}
            </span>
            <span className="flex items-center gap-1.5" aria-label="Kaydetme sayisi">
              <span aria-hidden>{post.bookmarkedByMe ? '★' : '☆'}</span>
              {post.bookmarkCount > 0 ? post.bookmarkCount : 'Kaydet'}
            </span>
            <span className="ml-auto flex items-center gap-1.5">
              <span aria-hidden>{post.commentCount}</span> yorum
            </span>
          </footer>
        </header>

        <div className="rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900/40">
          <CommentSection postId={id} />
        </div>

        {remove.isPending ? <Spinner className="mx-auto" /> : null}
      </article>
    </div>
  );
}
