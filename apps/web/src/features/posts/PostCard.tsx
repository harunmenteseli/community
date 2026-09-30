import { Link } from '@tanstack/react-router';
import { MessageCircle, Sparkles } from 'lucide-react';
import { POST_CATEGORY_LABELS, POST_GAME_LABELS } from '@community/shared';
import { Avatar } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { cn } from '../../lib/cn';
import type { Post } from './api';

export interface PostCardProps {
  post: Post;
}

/** Kisa sureli "zaman once" etiketi. Icerigin kendisi sunucudan ISO string gelir. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';

  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'az once';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} dk once`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat once`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gun once`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay once`;

  return `${Math.floor(months / 12)} yil once`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

export function PostCard({ post }: PostCardProps) {
  const excerpt = stripHtml(post.content).slice(0, 220);

  return (
    <article className="rounded-xl border border-ink-200 bg-white p-4 transition-colors hover:border-ink-300 dark:border-ink-800 dark:bg-ink-900/40 dark:hover:border-ink-700">
      <header className="flex items-start gap-3">
        {/* Profil rotasi #7 ile geliyor; o ana kadar yazi duz ve klicklenmez. */}
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
            {post.source === 'ai' ? (
              <Badge variant="ai">
                <Sparkles className="h-3 w-3" aria-hidden />
                AI
              </Badge>
            ) : null}
          </div>
        </div>
      </header>

      <Link to="/post/$id" params={{ id: post.id }} className="mt-3 block">
        {post.title ? <h2 className="text-base font-semibold leading-snug">{post.title}</h2> : null}
        <p className={cn('text-sm text-ink-600 dark:text-ink-300', post.title ? 'mt-1.5' : 'mt-0')}>
          {excerpt}
          {post.content.length > 220 ? '…' : ''}
        </p>
      </Link>

      {post.images.length > 0 ? (
        <ul className={cn('mt-3 grid gap-1.5', post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
          {post.images.slice(0, 2).map((image) => (
            <li key={image.url}>
              <img
                src={image.url}
                alt={image.alt ?? ''}
                loading="lazy"
                className="aspect-video w-full rounded-lg object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}

      {post.poll ? (
        <div className="mt-3 rounded-lg border border-ink-200 p-3 dark:border-ink-800">
          <p className="text-sm font-medium">{post.poll.question}</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {post.poll.options.map((option) => (
              <li key={option.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate">{option.text}</span>
                <span className="shrink-0 text-ink-500 dark:text-ink-400">{option.percentage}%</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <footer className="mt-3 flex items-center gap-4 text-sm text-ink-500 dark:text-ink-400">
        {/* Begenme/kaydetme aksiyonlari #6 kapsaminda; simdilik yalnizca sayaclar. */}
        <span className="flex items-center gap-1.5" aria-label="Begenme sayisi">
          <span aria-hidden>{post.likedByMe ? '♥' : '♡'}</span>
          {post.likeCount > 0 ? post.likeCount : ''}
        </span>

        <Link
          to="/post/$id"
          params={{ id: post.id }}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
        >
          <MessageCircle className="h-4 w-4" aria-hidden />
          <span className="sr-only">Yorumlar</span>
          {post.commentCount > 0 ? post.commentCount : ''}
        </Link>

        {post.bookmarkCount > 0 ? (
          <span className="ml-auto flex items-center gap-1.5" aria-label="Kaydetme sayisi">
            <span aria-hidden>☆</span>
            {post.bookmarkCount}
          </span>
        ) : null}
      </footer>
    </article>
  );
}
