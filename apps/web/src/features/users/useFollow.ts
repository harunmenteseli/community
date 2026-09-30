import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from './api';

interface ProfileShape {
  isFollowing: boolean;
  stats: { followerCount: number };
}

/**
 * Takip/takipten cik: once arayuzde aninda goster (optimistic), hata halinde
 * eski duruma doner. Degisken `wantFollowing` hedef durumu tutar, boylece
 * tersine cevirme hatasi olmaz.
 */
export function useFollow(username: string, isSelf: boolean) {
  const queryClient = useQueryClient();
  const key = ['profile', username] as const;

  const mutation = useMutation({
    mutationFn: (wantFollowing: boolean) =>
      wantFollowing ? usersApi.follow(username) : usersApi.unfollow(username),

    onMutate: async (wantFollowing) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProfileShape>(key);

      queryClient.setQueryData<ProfileShape>(key, (old) =>
        old
          ? {
              ...old,
              isFollowing: wantFollowing,
              stats: {
                ...old.stats,
                followerCount: Math.max(0, old.stats.followerCount + (wantFollowing ? 1 : -1)),
              },
            }
          : old,
      );

      return { previous };
    },

    onError: (err, _wantFollowing, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      toast.error(err instanceof Error ? err.message : 'İşlem tamamlanamadı, geri alındı');
    },

    onSettled: () => {
      // Takip filtresi ve profil sayaci sunucudan tazelensin.
      void queryClient.invalidateQueries({ queryKey: key });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  return {
    isPending: mutation.isPending,
    /** Kendine takip edilemez; çağıran taraf butonu gizlemeli. */
    toggle: (current: boolean) => {
      if (isSelf) return;
      mutation.mutate(!current);
    },
  };
}
