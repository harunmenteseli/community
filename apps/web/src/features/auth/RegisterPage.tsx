import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useSetAtom } from 'jotai';
import { registerSchema, type RegisterDto } from '@community/shared';
import { Button } from '../../components/ui/button';
import { Field } from '../../components/ui/field';
import { AuthShell } from './AuthShell';
import { authApi } from './api';
import { setSessionAtom } from '../../state/atoms';
import { zodResolver } from '../../lib/validation';
import { ApiError } from '../../lib/api';
import { useRedirectTarget } from './useRedirectTarget';

type RegisterForm = RegisterDto;

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useSetAtom(setSessionAtom);
  const redirectTo = useRedirectTarget();

  const register = useMutation({
    mutationFn: (values: RegisterForm) => authApi.register(values),
    onSuccess: async (result) => {
      setSession({ token: result.token, sessionId: result.session.id, user: result.user });
      toast.success('Hesabın oluşturuldu!');
      await navigate({ to: redirectTo });
    },
  });

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) as never });

  const onSubmit = handleSubmit((values) => register.mutate(values));

  const formError = register.error instanceof ApiError ? register.error.message : 'Bir şeyler ters gitti';

  return (
    <AuthShell
      title="Hesap oluştur"
      subtitle="Birkaç saniyede aramıza katıl."
      footer={
        <>
          Zaten hesabın var mı?{' '}
          <Link to="/login" className="font-medium text-accent-600 dark:text-accent-400">
            Giriş yap
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {register.isError ? (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {formError}
          </p>
        ) : null}

        <Field
          label="Ad"
          autoComplete="name"
          placeholder="Adın"
          error={errors.name}
          {...registerField('name')}
        />
        <Field
          label="Kullanıcı adı"
          autoComplete="username"
          placeholder="ornek_kullanici"
          hint="Harf, rakam ve alt çizgi — en az 3 karakter"
          error={errors.username}
          {...registerField('username')}
        />
        <Field
          label="E-posta"
          type="email"
          autoComplete="email"
          placeholder="ornek@site.com"
          error={errors.email}
          {...registerField('email')}
        />
        <Field
          label="Şifre"
          type="password"
          autoComplete="new-password"
          placeholder="En az 8 karakter"
          error={errors.password}
          {...registerField('password')}
        />

        <Button type="submit" size="lg" full loading={register.isPending}>
          Kayıt ol
        </Button>
      </form>
    </AuthShell>
  );
}