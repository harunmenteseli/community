import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { useSetAtom } from 'jotai';
import { loginSchema, type LoginDto } from '@community/shared';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { AuthShell } from './AuthShell';
import { authApi } from './api';
import { setSessionAtom } from '../../state/atoms';
import { zodResolver } from '../../lib/validation';
import { ApiError } from '../../lib/api';

type LoginForm = LoginDto;

export function LoginPage() {
  const navigate = useNavigate();
  const setSession = useSetAtom(setSessionAtom);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) as never });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setFormError(null);
    try {
      const result = await authApi.login(values);
      setSession({ token: result.token, user: result.user });
      toast.success('Hoş geldin!');
      await navigate({ to: '/' });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Bir şeyler ters gitti');
    } finally {
      setPending(false);
    }
  });

  return (
    <AuthShell
      title="Tekrar hoş geldin"
      subtitle="Topluluğa katıl, paylaş, geliştir."
      footer={
        <>
          Hesabın yok mu?{' '}
          <Link to="/register" className="font-medium text-accent-600 dark:text-accent-400">
            Kayıt ol
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {formError ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {formError}
          </p>
        ) : null}

        <Field
          label="E-posta"
          type="email"
          autoComplete="email"
          placeholder="ornek@site.com"
          error={errors.email}
          {...register('email')}
        />
        <Field
          label="Şifre"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <Link to="/forgot-password" className="text-sm text-ink-500 hover:text-ink-800 dark:text-ink-400 dark:hover:text-ink-200">
            Şifremi unuttum
          </Link>
        </div>

        <Button type="submit" size="lg" full loading={pending}>
          Giriş yap
        </Button>
      </form>
    </AuthShell>
  );
}