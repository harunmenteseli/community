import { useAtomValue } from 'jotai';
import { UserMinus, UserPlus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { userAtom } from '../../state/atoms';
import { useAuthorFollow } from './useAuthorFollow';
import type { Post } from '../posts/api';

interface AuthorFollowButtonProps {
  post: Post;
}

/**
 * Post kartindaki takip butonu. Kendi postunu takip etmek veya oturumsuz
 * durumda buton gostermek anlamsiz; bu durumlarda hic render edilmez.
 */
export function AuthorFollowButton({ post }: AuthorFollowButtonProps) {
  const user = useAtomValue(userAtom);
  const follow = useAuthorFollow({
    postId: post.id,
    authorId: post.author.id,
    username: post.author.username,
  });

  if (!user || follow.isSelf) return null;

  return (
    <Button
      variant={post.followedByMe ? 'outline' : 'primary'}
      size="sm"
      loading={follow.isPending}
      aria-pressed={post.followedByMe}
      aria-label={`${post.followedByMe ? 'Takipten çık' : 'Takip et'}: @${post.author.username}`}
      onClick={() => follow.toggle(post.followedByMe)}
    >
      {post.followedByMe ? (
        <UserMinus className="h-4 w-4" aria-hidden />
      ) : (
        <UserPlus className="h-4 w-4" aria-hidden />
      )}
      {post.followedByMe ? 'Takiptesin' : 'Takip et'}
    </Button>
  );
}
