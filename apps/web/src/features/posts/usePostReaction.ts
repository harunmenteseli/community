import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { toast } from 'sonner';
import { userAtom } from '../../state/atoms';
import { ApiError } from '../../lib/api';
import { postsApi } from './api';
import { patchFeedCache, patchPostCache, setReaction, toggleReaction, type ReactionKind } from './reactions';

interface UsePostReactionOptions {
  id: string;
  likedByMe: boolean;
  likeCount: number;
  bookmarkedByMe: boolean;
  bookmarkCount: number;
}

interface MutationVars {
  kind: ReactionKind;
}

/** onMutate'da saklanan, rollback icin gerekli cache anlik goruntuleri. */
interface ReactionContext {
  previousPost: unknown;
  previousFeeds: [readonly unknown[], unknown][];
}

/**
 * Begenme/kaydetme: once arayuzde aninda goster (optimistic), sonra sunucudan
 * gelen gercek degeri hizala. Hata halinde cache eski haline doner ve
 * kullaniciya bildirilir.
 */
export function usePostReaction({ id, ...reactions }: UsePostReactionOptions) {
  const queryClient = useQueryClient();
  const user = useAtomValue(userAtom);

  const mutation = useMutation({
    mutationFn: async ({ kind }: MutationVars): Promise<{ value: boolean }> => {
      if (kind === 'like') return { value: (await postsApi.toggleLike(id)).liked };
      return { value: (await postsApi.toggleBookmark(id)).bookmarked };
    },
    onMutate: async ({ kind }): Promise<ReactionContext | undefined> => {
      if (!user) return undefined;

      // Eski halleri sakla; rollback icin gerekli.
      await queryClient.cancelQueries({ queryKey: ['post', id] });
      const previousPost = queryClient.getQueryData(['post', id]);
      const previousFeeds = queryClient.getQueriesData({ queryKey: ['feed'] });

      queryClient.setQueriesData({ queryKey: ['feed'] }, (data) =>
        patchFeedCache(data as never, id, (post) => toggleReaction(post, kind)),
      );
      queryClient.setQueryData(['post', id], (data) =>
        patchPostCache(data as never, id, (post) => toggleReaction(post, kind)),
      );

      return { previousPost, previousFeeds: previousFeeds as [readonly unknown[], unknown][] };
    },
    onError: (err, _vars, context) => {
      if (context) {
        if (context.previousPost !== undefined) {
          queryClient.setQueryData(['post', id], context.previousPost);
        }
        for (const [key, data] of context.previousFeeds) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error(err instanceof ApiError ? err.message : 'İşlem tamamlanamadı, geri alındı');
    },
    onSuccess: (data, { kind }) => {
      // Sunucu sonucu hesapla degil mutlak deger dondurur; cache'i ona hizala.
      queryClient.setQueriesData({ queryKey: ['feed'] }, (old) =>
        patchFeedCache(old as never, id, (post) => setReaction(post, kind, data.value)),
      );
      queryClient.setQueryData(['post', id], (old) =>
        patchPostCache(old as never, id, (post) => setReaction(post, kind, data.value)),
      );
    },
  });

  return {
    ...reactions,
    isPending: mutation.isPending,
    /** Oturum yoksa false doner; cagiran taraf login'e yonlendirir. */
    toggle: (kind: ReactionKind) => {
      if (!user) return false;
      mutation.mutate({ kind });
      return true;
    },
  };
}
