import {
  type UserPublic,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type RegisterDto,
  type LoginDto,
  type ForgotPasswordDto,
} from '@community/shared';
import { http } from '../../lib/api';
import type { SessionUser } from '../../state/auth';

interface AuthResponse {
  token: string;
  session: { id: string; expiresAt: string };
  user: SessionUser;
}

interface MeResponse {
  user: SessionUser;
}

export const authApi = {
  login: (input: LoginDto) => http.post<AuthResponse>('/api/auth/login', loginSchema.parse(input)),
  register: (input: RegisterDto) => http.post<AuthResponse>('/api/auth/register', registerSchema.parse(input)),
  me: () => http.get<MeResponse>('/api/auth/me'),
  logout: () => http.post<{ success: true }>('/api/auth/logout'),
  verifyEmail: (token: string) => http.post<{ success: true }>('/api/auth/verify-email', { token }),
  resendVerification: (email: string) => http.post<{ success: true }>('/api/auth/resend-verification', { email }),
  forgotPassword: (input: ForgotPasswordDto) =>
    http.post<{ success: true }>('/api/auth/forgot-password', forgotPasswordSchema.parse(input)),
  resetPassword: (token: string, password: string) =>
    http.post<{ success: true }>('/api/auth/reset-password', resetPasswordSchema.parse({ token, password })),
};

export type { AuthResponse, UserPublic };