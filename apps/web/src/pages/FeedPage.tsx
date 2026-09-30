import { Link } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useAtomValue } from 'jotai';
import { userAtom } from '../state/atoms';
import { Button } from '../components/ui/button';
import { FeedList } from '../features/posts/FeedList';

export function FeedPage() {
  const user = useAtomValue(userAtom);

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Feed</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Topluluğun paylaştığı sorular, öneriler ve kariyer hikayeleri.
          </p>
        </div>
        {user ? (
          <Link to="/post/yeni">
            <Button size="sm">
              <Plus className="h-4 w-4" aria-hidden />
              Yeni post
            </Button>
          </Link>
        ) : null}
      </div>

      <FeedList />
    </div>
  );
}
