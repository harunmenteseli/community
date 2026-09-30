import { Link, useNavigate } from '@tanstack/react-router';
import { useAtomValue, useSetAtom } from 'jotai';
import { toast } from 'sonner';
import { LogOut, PenSquare } from 'lucide-react';
import { userAtom, clearSessionAtom } from '../../state/atoms';
import { BrandMark } from '../../features/auth/AuthShell';
import { Avatar } from '../ui/avatar';
import { Button } from '../ui/button';
import { authApi } from '../../features/auth/api';
import { ApiError } from '../../lib/api';

export function Header() {
  const user = useAtomValue(userAtom);
  const clearSession = useSetAtom(clearSessionAtom);
  const navigate = useNavigate();

  const onLogout = async () => {
    // Once sunucuya bildir: token localStorage'dan silinince istek yetkisiz gider
    // ve oturum veritabaninda aktif kalir.
    try {
      await authApi.logout();
    } catch (err) {
      if (!(err instanceof ApiError)) {
        toast.error('Çıkış yapılırken bir hata oluştu');
      }
    }
    clearSession();
    await navigate({ to: '/feed' });
    toast.success('Çıkış yapıldı');
  };

  return (
    <header className="glass sticky top-0 z-40 h-16">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-base font-semibold tracking-tight">Community</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link to="/feed" className="hidden text-sm font-medium hover:underline sm:inline">
            Feed
          </Link>
          {user ? (
            <>
              <Link to="/vitrin" className="hidden text-sm font-medium hover:underline sm:inline">
                Vitrin
              </Link>
              <Link to="/post/yeni">
                <Button variant="outline" size="sm">
                  <PenSquare className="h-4 w-4" />
                  Yeni Post
                </Button>
              </Link>
              <Link to="/u/$username" params={{ username: user.username }} className="flex items-center gap-2">
                <Avatar
                  src={user.avatarUrl ?? undefined}
                  name={user.name}
                  className="h-8 w-8 text-xs"
                />
                <span className="hidden text-sm font-medium sm:inline">{user.name}</span>
              </Link>
              <Button variant="ghost" size="icon-sm" aria-label="Çıkış yap" onClick={onLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Giriş yap
                </Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Kayıt ol</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}