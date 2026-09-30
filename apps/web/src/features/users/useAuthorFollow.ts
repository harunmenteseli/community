import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { ApiError } from '../../lib/api';
import { userAtom } from '../../state/atoms';
import { usersApi } from './api';
import { patchFollowedInFeed, patchPostFollowed } from './follows';

interface UseAuthorFollowOptions {
  postId: string;
  authorId: string;
  username: string;
}

interface FollowContext {
  previousFeeds: [readonly unknown[], unknown][];
  previousPost: unknown;
}

/**
 * Post kartindaki takip butonu: once arayuzde aninda goster (optimistic), hata
 * halinde tum feed ve post detay cache'ini eski haline doner.
 */
export function useAuthorFollow({ postId, authorId, username }: UseAuthorFollowOptions) {
  const queryClient = useQueryClient();
  const user = useAtomValue(userAtom);
  const isSelf = user?.id === authorId;

  const mutation = useMutation({
    mutationFn: (wantFollowing: boolean) =>
      wantFollowing ? usersApi.follow(username) : usersApi.unfollow(username),

    onMutate: async (wantFollowing): Promise<FollowContext> => {
      await queryClient.cancelQueries({ queryKey: ['feed'] });
      await queryClient.cancelQueries({ queryKey: ['post', postId] });
      const previousFeeds = queryClient.getQueriesData({ queryKey: ['feed'] });
      const previousPost = queryClient.getQueryData(['post', postId]);

      queryClient.setQueriesData({ queryKey: ['feed'] }, (data) =>
        patchFollowedInFeed(data as never, authorId, wantFollowing),
      );
      queryClient.setQueryData(['post', postId], (data) =>
        patchPostFollowed(data as never, postId, wantFollowing),
      );

      return { previousFeeds: previousFeeds as [readonly unknown[], unknown][], previousPost };
    },

    onError: (err, _wantFollowing, context) => {
      if (context) {
        for (const [key, data] of context.previousFeeds) queryClient.setQueryData(key, data);
        if (context.previousPost !== undefined) queryClient.setQueryData(['post', postId], context.previousPost);
      }
      toast.error(err instanceof ApiError ? err.message : 'İşlem tamamlanamadı, geri alındı');
    },

    onSettled: () => {
      // Takip filtresi ve profil sayacı sunucudan tazelensin.
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['profile', username] });
    },
  });

  return {
    isSelf,
    isPending: mutation.isPending,
    toggle: (current: boolean) => {
      if (!user || isSelf) return false;
      mutation.mutate(!current);
      return true;
    },
  };
}
