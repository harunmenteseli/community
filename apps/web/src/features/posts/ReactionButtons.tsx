import { useNavigate } from '@tanstack/react-router';
import { Bookmark, Heart } from 'lucide-react';
import { cn } from '../../lib/cn';
import { usePostReaction } from './usePostReaction';

interface ReactionButtonsProps {
  postId: string;
  likedByMe: boolean;
  likeCount: number;
  bookmarkedByMe: boolean;
  bookmarkCount: number;
  /** Detay sayfasinda sayilar her zaman gorunur; kartta 0 iken gizlenir. */
  alwaysShowCounts?: boolean;
  className?: string;
}

export function ReactionButtons({
  postId,
  likedByMe,
  likeCount,
  bookmarkedByMe,
  bookmarkCount,
  alwaysShowCounts = false,
  className,
}: ReactionButtonsProps) {
  const navigate = useNavigate();
  const { toggle } = usePostReaction({ id: postId, likedByMe, likeCount, bookmarkedByMe, bookmarkCount });

  const onReact = (kind: 'like' | 'bookmark') => {
    // Oturum yoksa begenme calismaz; girise yonlendir (post korunur).
    if (!toggle(kind)) {
      void navigate({ to: '/login', search: { redirect: `/post/${postId}` } });
    }
  };

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <button
        type="button"
        onClick={() => onReact('like')}
        aria-pressed={likedByMe}
        aria-label={likedByMe ? 'Beğeniyi kaldır' : 'Beğen'}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200',
          likedByMe && 'text-red-600 dark:text-red-400',
        )}
      >
        <Heart className={cn('h-4 w-4', likedByMe && 'fill-current')} aria-hidden />
        {alwaysShowCounts || likeCount > 0 ? (
          <span className="tabular-nums">{likeCount}</span>
        ) : (
          <span className="sr-only">Beğen</span>
        )}
      </button>

      <button
        type="button"
        onClick={() => onReact('bookmark')}
        aria-pressed={bookmarkedByMe}
        aria-label={bookmarkedByMe ? 'Kaydı kaldır' : 'Kaydet'}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200',
          bookmarkedByMe && 'text-amber-600 dark:text-amber-400',
        )}
      >
        <Bookmark className={cn('h-4 w-4', bookmarkedByMe && 'fill-current')} aria-hidden />
        {alwaysShowCounts || bookmarkCount > 0 ? (
          <span className="tabular-nums">{bookmarkCount}</span>
        ) : (
          <span className="sr-only">Kaydet</span>
        )}
      </button>
    </div>
  );
}
