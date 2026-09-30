import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { ExternalLink, UserMinus, UserPlus } from 'lucide-react';
import { Avatar } from '../components/ui/avatar';
import { Button, buttonClasses } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { userAtom } from '../state/atoms';
import { usersApi } from '../features/users/api';
import { useFollow } from '../features/users/useFollow';

function joinDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', { year: 'numeric', month: 'long' }).format(date);
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-ink-500 dark:text-ink-400">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export function ProfilePage() {
  const { username } = useParams({ from: '/u/$username' });
  const user = useAtomValue(userAtom);

  const profile = useQuery({
    queryKey: ['profile', username],
    queryFn: () => usersApi.profile(username),
  });

  const projects = useQuery({
    queryKey: ['profile', username, 'projects'],
    queryFn: () => usersApi.projects(username),
  });

  const data = profile.data;
  const follow = useFollow(username, Boolean(data?.isSelf));

  if (profile.isPending) {
    return (
      <div className="container-page mx-auto max-w-3xl space-y-4 py-10">
        <Skeleton lines={4} />
        <Skeleton lines={3} />
      </div>
    );
  }

  if (profile.isError || !data) {
    return (
      <div className="container-page flex flex-col items-center py-24 text-center">
        <p className="text-sm text-ink-500 dark:text-ink-400">Profil bulunamadı.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => void profile.refetch()}>
          Tekrar dene
        </Button>
      </div>
    );
  }

  const projectList = projects.data?.projects ?? [];

  return (
    <div className="container-page mx-auto max-w-3xl space-y-6 py-10">
      <article className="space-y-6">
      <header className="rounded-xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="flex items-start gap-4">
          <Avatar src={data.user.avatarUrl ?? undefined} name={data.user.name} size="xl" />

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">{data.user.name}</h1>
            <p className="text-sm text-ink-500 dark:text-ink-400">@{data.user.username}</p>

            {data.user.bio ? (
              <p className="mt-2 whitespace-pre-line text-sm text-ink-700 dark:text-ink-200">{data.user.bio}</p>
            ) : null}

            {data.user.siteUrl ? (
              <a
                href={data.user.siteUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-accent-600 hover:underline dark:text-accent-400"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                {data.user.siteUrl.replace(/^https?:\/\//, '')}
              </a>
            ) : null}

            <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
              {joinDate(data.user.createdAt)} tarihinden beri üye
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            {data.isSelf ? (
              <Link to="/ayarlar/profil" className={buttonClasses({ variant: 'outline', size: 'sm' })}>
                Profili düzenle
              </Link>
            ) : user ? (
              <Button
                variant={data.isFollowing ? 'outline' : 'primary'}
                size="sm"
                loading={follow.isPending}
                aria-pressed={data.isFollowing}
                onClick={() => follow.toggle(data.isFollowing)}
              >
                {data.isFollowing ? (
                  <UserMinus className="h-4 w-4" aria-hidden />
                ) : (
                  <UserPlus className="h-4 w-4" aria-hidden />
                )}
                {data.isFollowing ? 'Takiptesin' : 'Takip et'}
              </Button>
            ) : (
              <Link
                to="/login"
                search={{ redirect: `/u/${data.user.username}` }}
                className={buttonClasses({ variant: 'primary', size: 'sm' })}
              >
                Giriş yap
              </Link>
            )}
          </div>
        </div>

        <dl className="mt-4 flex flex-wrap gap-6 text-sm">
          <Stat label="Post" value={data.stats.postCount} />
          <Stat label="Vitrin" value={data.stats.projectCount} />
          <Stat label="Takipçi" value={data.stats.followerCount} />
          <Stat label="Takip" value={data.stats.followingCount} />
        </dl>
      </header>

      <section aria-labelledby="vitrin-basligi">
        <h2
          id="vitrin-basligi"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400"
        >
          Vitrin kayıtları
        </h2>

        {projects.isPending ? <Skeleton lines={3} /> : null}

        {projects.isError ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">Vitrin kayıtları yüklenemedi.</p>
        ) : null}

        {!projects.isPending && !projects.isError && projectList.length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">Henüz vitrin kaydı yok.</p>
        ) : null}

        {projectList.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projectList.map((project) => (
              <li key={project.id} className="rounded-xl border border-ink-200 p-4 dark:border-ink-800">
                <div className="flex items-center gap-2">
                  {project.logoUrl ? (
                    <img src={project.logoUrl} alt="" className="h-8 w-8 rounded object-cover" loading="lazy" />
                  ) : null}
                  <a
                    href={project.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm font-semibold hover:underline"
                  >
                    {project.name}
                  </a>
                </div>
                {project.description ? (
                  <p className="mt-2 text-sm text-ink-600 dark:text-ink-300">{project.description}</p>
                ) : null}
                <p className="mt-2 text-xs text-ink-500 dark:text-ink-400">
                  {[project.category, project.buildWith].filter(Boolean).join(' · ')}
                  {project.ratingCount > 0 ? ` · ${project.avgRating?.toFixed(1)} (${project.ratingCount})` : ''}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      </article>
    </div>
  );
}
