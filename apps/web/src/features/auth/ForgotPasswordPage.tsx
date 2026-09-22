import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { forgotPasswordSchema, type ForgotPasswordDto } from '@community/shared';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { AuthShell } from './AuthShell';
import { authApi } from './api';
import { zodResolver } from '../../lib/validation';
import { ApiError } from '../../lib/api';

type ForgotForm = ForgotPasswordDto;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotForm>({ resolver: zodResolver(forgotPasswordSchema) as never });

  const startCooldown = () => {
    setResendCooldown(30);
    const timer = window.setInterval(() => {
      setResendCooldown((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
  };

  const send = async (email: string) => {
    setFormError(null);
    await authApi.forgotPassword({ email });
    startCooldown();
  };

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);
    setFormError(null);
    try {
      await send(values.email);
      setSent(true);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Bir şeyler ters gitti');
    } finally {
      setPending(false);
    }
  });

  const onResend = async () => {
    if (resendCooldown > 0) return;
    const email = handleSubmit(async (values) => send(values.email))();
    await email;
  };

  return (
    <AuthShell
      title="Şifreni sıfırla"
      subtitle="E-posta adresini gir, sıfırlama linkini gönderelim."
      footer={
        <>
          Aklına geldi mi?{' '}
          <Link to="/login" className="font-medium text-accent-600 dark:text-accent-400">
            Giriş yap
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="flex flex-col gap-4 py-2 text-center">
          <p className="text-sm text-ink-600 dark:text-ink-300">
            Sıfırlama linkini e-posta adresine gönderdik. E-posta kutunu kontrol et.
          </p>
          <Button variant="secondary" onClick={onResend} disabled={resendCooldown > 0}>
            {resendCooldown > 0 ? `${resendCooldown}s sonra tekrar dene` : 'Tekrar gönder'}
          </Button>
        </div>
      ) : (
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

          <Button type="submit" size="lg" full loading={pending}>
            Sıfırlama linki gönder
          </Button>
        </form>
      )}
    </AuthShell>
  );
}