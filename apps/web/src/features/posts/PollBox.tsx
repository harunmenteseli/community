import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { BarChart3, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { userAtom } from '../../state/atoms';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/cn';
import { ApiError } from '../../lib/api';
import { postsApi, type PostPoll } from './api';

interface PollBoxProps {
  postId: string;
  poll: PostPoll;
}

/**
 * Anket sonuclari + oylama. Tek oy kurali sunucuda uygulanir; ayni secenege
 * tekrar basmak oyu geri alir. Kapali ankette oylama kapalidir.
 */
export function PollBox({ postId, poll }: PollBoxProps) {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();

  const vote = useMutation({
    mutationFn: (optionId: string) => postsApi.voteOnPoll(postId, optionId),
    onSuccess: (data, optionId) => {
      // Yaniti aninda goster, sonra sunucudan dogrula (cevaplar yarista gelebilir).
      queryClient.setQueryData(['post', postId], (prev: { post?: { poll: PostPoll | null } } | undefined) =>
        prev?.post ? { post: { ...prev.post, poll: data.poll } } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: ['post', postId] });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.success(poll.myVote === optionId ? 'Oyun geri alındı' : 'Oyun kaydedildi');
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Oyun kaydedilemedi');
    },
  });

  const disabled = poll.closed || vote.isPending;
  const onVote = (optionId: string) => {
    // Cift tiklamayi ve cakisan istekleri engelle.
    if (disabled) return;
    vote.mutate(optionId);
  };

  return (
    <section className="mt-4 rounded-lg border border-ink-200 p-3 dark:border-ink-800">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{poll.question}</p>
        {poll.closed ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
            <Lock className="h-3 w-3" aria-hidden />
            Kapandı
          </span>
        ) : null}
      </div>

      {poll.totalVotes === 0 ? (
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">Henüz oy yok.</p>
      ) : (
        <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{poll.totalVotes} oy</p>
      )}

      <ul className="mt-2 flex flex-col gap-1.5">
        {poll.options.map((option) => {
          const isMine = poll.myVote === option.id;
          return (
            <li key={option.id}>
              <button
                type="button"
                disabled={disabled || !user}
                aria-pressed={isMine}
                data-option-id={option.id}
                data-option-text={option.text}
                onClick={() => onVote(option.id)}
                title={!user ? 'Oylamak için giriş yapmalısın' : undefined}
                className={cn(
                  'relative w-full overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500',
                  'disabled:cursor-not-allowed disabled:opacity-70',
                  isMine
                    ? 'border-accent-500 bg-accent-500/5'
                    : 'border-ink-200 hover:border-ink-300 hover:bg-ink-50 dark:border-ink-700 dark:hover:bg-ink-800/50',
                )}
              >
                {/* Yuzde dolgusu */}
                <span
                  aria-hidden
                  className={cn('absolute inset-y-0 left-0 bg-accent-500/15', isMine && 'bg-accent-500/25')}
                  style={{ width: `${option.percentage}%` }}
                />
                <span className="relative flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{option.text}</span>
                    {isMine ? (
                      <span className="shrink-0 text-xs font-medium text-accent-600 dark:text-accent-400">
                        (oyun)
                      </span>
                    ) : null}
                  </span>
                  <span className="shrink-0 tabular-nums text-ink-500 dark:text-ink-400">
                    {option.percentage}%
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="mt-2 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
        {vote.isPending ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : <BarChart3 className="h-3 w-3" aria-hidden />}
        <span>
          {poll.closed
            ? 'Anket kapandı, oy verilemiyor.'
            : user
              ? 'Tek oy kullanabilirsin; oyunu geri almak için aynı seçeneğe tekrar bas.'
              : 'Oylamak için giriş yapmalısın.'}
        </span>
      </footer>

      {!user && !poll.closed ? (
        <Link to="/login" search={{ redirect: `/post/${postId}` }} className="mt-2 inline-block">
          <Button variant="outline" size="sm">
            Giriş yap
          </Button>
        </Link>
      ) : null}
    </section>
  );
}
