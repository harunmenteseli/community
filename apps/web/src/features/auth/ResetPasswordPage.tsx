import { useState } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { AuthShell } from './AuthShell';
import { authApi } from './api';
import { zodResolver } from '../../lib/validation';
import { ApiError } from '../../lib/api';
import { z } from 'zod';

const resetFormSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirm: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirm, {
    path: ['confirm'],
    message: 'Şifreler eşleşmiyor',
  });

type ResetForm = z.infer<typeof resetFormSchema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.searchStr ?? '').get('token');
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({ resolver: zodResolver(resetFormSchema) as never });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) {
      setFormError('Sıfırlama linki geçersiz.');
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      await authApi.resetPassword(token, values.password);
      toast.success('Şifren güncellendi');
      await navigate({ to: '/login' });
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Bir şeyler ters gitti');
    } finally {
      setPending(false);
    }
  });

  return (
    <AuthShell
      title="Yeni şifre belirle"
      subtitle="Kullanıcı adın veya e-postanla kimliğini doğruladık."
      footer={
        <>
          <Link to="/login" className="font-medium text-accent-600 dark:text-accent-400">
            Giriş yap
          </Link>
        </>
      }
    >
      {!token ? (
        <p className="text-sm text-red-600 dark:text-red-400">Sıfırlama linki geçersiz veya eksik.</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError ? (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </p>
          ) : null}

          <Field
            label="Yeni şifre"
            type="password"
            autoComplete="new-password"
            placeholder="En az 8 karakter"
            error={errors.password}
            {...register('password')}
          />
          <Field
            label="Yeni şifre (tekrar)"
            type="password"
            autoComplete="new-password"
            placeholder="Şifreni doğrula"
            error={errors.confirm}
            {...register('confirm')}
          />

          <Button type="submit" size="lg" full loading={pending}>
            Şifremi güncelle
          </Button>
        </form>
      )}
    </AuthShell>
  );
}