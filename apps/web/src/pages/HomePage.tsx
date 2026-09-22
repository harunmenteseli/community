import { Link } from '@tanstack/react-router';
import { useAtomValue } from 'jotai';
import { ArrowRight } from 'lucide-react';
import { userAtom } from '../state/atoms';
import { Button } from '../components/ui/button';

export function HomePage() {
  const user = useAtomValue(userAtom);

  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <span className="mb-4 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-600 dark:text-accent-400">
        Topluluk önizlemesi
      </span>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-balance sm:text-5xl">
        Geliştiriciler için <span className="text-brand-gradient">topluluk</span> platformu
      </h1>
      <p className="mt-4 max-w-xl text-base text-ink-500 dark:text-ink-400">
        Soru sor, fikir paylaş, projelerini vitrine çıkar. Feed, Launchpad ve haftalık AI özeti
        yakında burada.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {user ? (
          <Button size="lg">
            Devam et
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <>
            <Link to="/register">
              <Button size="lg">
                Kayıt ol
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Giriş yap
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}