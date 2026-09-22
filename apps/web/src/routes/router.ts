import { createRootRoute, createRoute, createRouter, type Router } from '@tanstack/react-router';
import { RootLayout } from '../components/layout/RootLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { SecurityPage } from '../pages/SecurityPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/ResetPasswordPage';
import { VerifyEmailPage } from '../features/auth/VerifyEmailPage';
import { GithubOAuthCallbackPage } from '../features/auth/GithubOAuthCallbackPage';

const rootRoute = createRootRoute({
  component: RootLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
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

const securityRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/security',
  component: SecurityPage,
});

const githubOAuthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth/oauth/github',
  component: GithubOAuthCallbackPage,
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
  securityRoute,
  githubOAuthRoute,
  notFoundRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export type AppRouter = Router<typeof routeTree>;