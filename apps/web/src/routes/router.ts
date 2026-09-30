import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  type Router,
} from '@tanstack/react-router';
import { RootLayout } from '../components/layout/RootLayout';
import { SettingsLayout } from '../components/layout/SettingsLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SecurityPage } from '../pages/SecurityPage';
import { EditProfilePage } from '../pages/EditProfilePage';
import { NotificationSettingsPage } from '../pages/NotificationSettingsPage';
import { AccountPage } from '../pages/AccountPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage';
import { NewPostPage } from '../pages/NewPostPage';
import { TaslaklarPage } from '../pages/TaslaklarPage';
import { FeedPage } from '../pages/FeedPage';
import { PostDetailPage } from '../pages/PostDetailPage';
import { ProfilePage } from '../pages/ProfilePage';
import { ShowcasePage } from '../pages/ShowcasePage';
import { ProjectFormPage } from '../pages/ProjectFormPage';
import { CareerShowcasePage } from '../pages/CareerShowcasePage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { store } from '../state/bootstrap';
import { isAuthedAtom } from '../state/atoms';

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  // validateSearch tanimlanmiyor: redirect param'ini useRedirectTarget ham
  // searchStr'den okuyor ve boylece linklerde search vermek zorunlu olmuyor.
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  component: VerifyEmailPage,
});

// Ayarlar alanı: koruma ve yerleşim tek bir layout rotasında toplanır.
// Önceden her sayfa kendi "Giriş gerekli" ekranını gösteriyordu; artık
// kimliksiz erişim login'e yönleniyor ve dönüş adresi korunuyor.
const settingsLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: '/settings-layout',
  component: SettingsLayout,
  beforeLoad: ({ location }) => {
    if (store.get(isAuthedAtom)) return;
    throw redirect({ to: '/login', search: { redirect: location.href } as never });
  },
});

const settingsIndexRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/settings',
  beforeLoad: () => {
    throw redirect({ to: '/settings/profile' });
  },
});

const editProfileRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/settings/profile',
  component: EditProfilePage,
});

// Eski adres: profil düzenleme sayfası "/ayarlar/profil" idi.
const legacyEditProfileRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/ayarlar/profil',
  beforeLoad: () => {
    throw redirect({ to: '/settings/profile' });
  },
});

const securityRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/settings/security',
  component: SecurityPage,
});

const notificationSettingsRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/settings/notifications',
  component: NotificationSettingsPage,
});

const accountRoute = createRoute({
  getParentRoute: () => settingsLayoutRoute,
  path: '/settings/account',
  component: AccountPage,
});

const newPostRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/post/yeni',
  component: NewPostPage,
});

const taslaklarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/taslaklar',
  component: TaslaklarPage,
});

const feedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feed',
  component: FeedPage,
});

const postDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/post/$id',
  component: PostDetailPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/u/$username',
  component: ProfilePage,
});

const showcaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vitrin',
  component: ShowcasePage,
});

const careerShowcaseRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/kariyer-vitrini',
  component: CareerShowcasePage,
});

const newProjectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vitrin/yeni',
  component: ProjectFormPage,
});

const editProjectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/vitrin/$projectId',
  component: ProjectFormPage,
});

const notificationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/bildirimler',
  component: NotificationsPage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '*',
  component: NotFoundPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  settingsLayoutRoute.addChildren([
    settingsIndexRoute,
    editProfileRoute,
    legacyEditProfileRoute,
    securityRoute,
    notificationSettingsRoute,
    accountRoute,
  ]),
  newPostRoute,
  taslaklarRoute,
  feedRoute,
  postDetailRoute,
  profileRoute,
  showcaseRoute,
  newProjectRoute,
  editProjectRoute,
  careerShowcaseRoute,
  notificationsRoute,
  notFoundRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export type AppRouter = Router<typeof routeTree>;
