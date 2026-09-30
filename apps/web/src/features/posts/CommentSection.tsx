import { useCallback, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userAtom } from '../../state/atoms';
import { Avatar } from '../../components/ui/avatar';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { Spinner } from '../../components/ui/spinner';
import { timeAgo } from './PostCard';
import { commentsApi, type Comment } from './commentsApi';

function CommentItem({ comment, postId }: { comment: Comment; postId: string }) {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () => commentsApi.remove(comment.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  return (
    <li className="flex gap-3">
      <Avatar src={comment.author.avatarUrl ?? undefined} name={comment.author.name} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500 dark:text-ink-400">
          <span className="font-medium text-ink-700 dark:text-ink-200">{comment.author.name}</span>
          <span>@{comment.author.username}</span>
          <span aria-hidden>·</span>
          <time dateTime={comment.createdAt}>{timeAgo(comment.createdAt)}</time>
          {user?.id === comment.author.id ? (
            <button
              type="button"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
              className="ml-auto rounded px-1 py-0.5 text-xs text-red-600 hover:underline disabled:opacity-60 dark:text-red-400"
            >
              Sil
            </button>
          ) : null}
        </div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{comment.content}</p>

        {comment.replies && comment.replies.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-2 border-l border-ink-200 pl-3 dark:border-ink-800">
            {comment.replies.map((reply) => (
              <li key={reply.id} className="flex gap-2">
                <Avatar src={reply.author.avatarUrl ?? undefined} name={reply.author.name} size="xs" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-ink-500 dark:text-ink-400">
                    <span className="font-medium text-ink-700 dark:text-ink-200">{reply.author.name}</span>
                    <span aria-hidden>·</span>
                    <time dateTime={reply.createdAt}>{timeAgo(reply.createdAt)}</time>
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink-700 dark:text-ink-200">{reply.content}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
  );
}

export interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');

  const query = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => commentsApi.list(postId),
  });

  const create = useMutation({
    mutationFn: (body: string) => commentsApi.create({ postId, content: body }),
    onSuccess: () => {
      setContent('');
      void queryClient.invalidateQueries({ queryKey: ['comments', postId] });
    },
  });

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = content.trim();
      if (trimmed.length === 0) return;
      create.mutate(trimmed);
    },
    [content, create],
  );

  return (
    <section aria-label="Yorumlar" className="flex flex-col gap-4">
      <h2 className="text-base font-semibold">
        Yorumlar
        {query.data ? <span className="ml-1.5 text-sm font-normal text-ink-500 dark:text-ink-400">{query.data.comments.length}</span> : null}
      </h2>

      {user ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <label htmlFor="comment-content" className="sr-only">
            Yorumun
          </label>
          <textarea
            id="comment-content"
            rows={3}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Bir şeyler yaz…"
            className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-ink-400 focus:border-accent-500 dark:border-ink-800 dark:bg-ink-900/40"
          />
          {create.isError ? (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400">
              Yorum gönderilemedi.
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={create.isPending || content.trim().length === 0}>
              {create.isPending ? 'Gönderiliyor…' : 'Yorum gönder'}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Yorum yapmak için{' '}
          <Link to="/login" className="font-medium text-accent-600 hover:underline dark:text-accent-400">
            giriş yap
          </Link>
          .
        </p>
      )}

      {query.isPending ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }, (_, i) => (
            <div key={i} className="rounded-lg border border-ink-200 p-3 dark:border-ink-800">
              <Skeleton lines={2} />
            </div>
          ))}
        </div>
      ) : null}

      {query.isError ? (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-sm text-ink-500 dark:text-ink-400">Yorumlar yüklenemedi.</p>
          <Button variant="ghost" size="sm" onClick={() => void query.refetch()}>
            Tekrar dene
          </Button>
        </div>
      ) : null}

      {query.data && query.data.comments.length === 0 ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">Henüz yorum yok. İlk yorumu sen yaz.</p>
      ) : null}

      {query.data && query.data.comments.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {query.data.comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} postId={postId} />
          ))}
        </ul>
      ) : null}

      {query.isFetching && !query.isPending ? <Spinner className="mx-auto" /> : null}
    </section>
  );
}
