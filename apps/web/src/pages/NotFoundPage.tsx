import { Link } from '@tanstack/react-router';
import { Button } from '../components/ui/button';

export function NotFoundPage() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="text-6xl font-bold text-brand-gradient">404</p>
      <h1 className="mt-4 text-xl font-semibold">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">
        Aradığın sayfa taşınmış ya da hiç var olmamış olabilir.
      </p>
      <Link to="/" className="mt-6">
        <Button variant="outline">Ana sayfaya dön</Button>
      </Link>
    </div>
  );
}