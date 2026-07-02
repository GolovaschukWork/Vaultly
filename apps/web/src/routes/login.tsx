import { Button, Input, Label } from '@vaultly/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2, Vault } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { createAuthFormSchema, type AuthFormValues } from '@/lib/auth-schemas';
import { getAuthErrorKey, normalizeAuthEmail } from '@/lib/auth-errors';
import { supabase } from '@/lib/supabase';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

type AuthMode = 'signIn' | 'signUp';

function FieldError({ message }: { message?: string }) {
  const { t } = useTranslation();
  if (!message) return null;
  return <p className="text-danger text-sm">{t(`errors:${message}`)}</p>;
}

function AuthError({ message }: { message?: string }) {
  const { t } = useTranslation();
  if (!message) return null;

  const errorKey = getAuthErrorKey(message);
  if (errorKey) {
    return <p className="text-danger text-sm">{t(`auth:${errorKey}`)}</p>;
  }

  return <p className="text-danger text-sm">{message}</p>;
}

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>('signIn');

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(createAuthFormSchema(mode)),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
    mode: 'onTouched',
  });

  useEffect(() => {
    form.clearErrors();
    form.reset({
      email: form.getValues('email'),
      password: '',
      confirmPassword: '',
    });
  }, [mode, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root');

    try {
      const email = normalizeAuthEmail(values.email);
      const result =
        mode === 'signIn'
          ? await supabase.auth.signInWithPassword({
              email,
              password: values.password,
            })
          : await supabase.auth.signUp({
              email,
              password: values.password,
            });

      if (result.error) {
        form.setError('root', { message: result.error.message });
        return;
      }

      if (mode === 'signUp' && !result.data.session) {
        form.setError('root', { message: t('auth:checkEmail') });
        return;
      }

      await navigate({ to: '/' });
    } catch {
      form.setError('root', { message: t('errors:authFailed') });
    }
  });

  const isSubmitting = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  return (
    <div className="app-gradient bg-surface flex min-h-screen items-center justify-center p-4">
      <div className="border-border bg-surface w-full max-w-md rounded-2xl border p-8 shadow-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="from-brand-600 to-brand-500 mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br shadow-sm">
            <Vault className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-content-primary text-2xl font-bold">{t('common:appName')}</h1>
          <p className="text-content-secondary mt-1 text-sm">
            {mode === 'signIn' ? t('auth:subtitle') : t('auth:signUpSubtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth:email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              maxLength={255}
              aria-invalid={!!form.formState.errors.email}
              {...form.register('email')}
            />
            <FieldError message={form.formState.errors.email?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('auth:password')}</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              maxLength={128}
              aria-invalid={!!form.formState.errors.password}
              {...form.register('password')}
            />
            <FieldError message={form.formState.errors.password?.message} />
          </div>

          {mode === 'signUp' && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth:confirmPassword')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                maxLength={128}
                aria-invalid={!!form.formState.errors.confirmPassword}
                {...form.register('confirmPassword')}
              />
              <FieldError message={form.formState.errors.confirmPassword?.message} />
            </div>
          )}

          {rootError && <AuthError message={rootError} />}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('common:loading')}
              </>
            ) : mode === 'signIn' ? (
              t('auth:signIn')
            ) : (
              t('auth:signUp')
            )}
          </Button>
        </form>

        <p className="text-content-secondary mt-6 text-center text-sm">
          {mode === 'signIn' ? t('auth:noAccount') : t('auth:hasAccount')}{' '}
          <button
            type="button"
            className="text-brand-600 dark:text-brand-400 font-medium hover:underline"
            onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          >
            {mode === 'signIn' ? t('auth:signUp') : t('auth:signIn')}
          </button>
        </p>
      </div>
    </div>
  );
}
