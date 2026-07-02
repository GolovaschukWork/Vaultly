import { Button, Input, Label } from '@vaultly/ui';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2, Vault } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { createAuthFormSchema, type AuthFormValues } from '@/lib/auth-schemas';
import { getAuthErrorKey, normalizeAuthEmail } from '@/lib/auth-errors';
import {
  clearOAuthCallbackParams,
  getOAuthCallbackError,
  signInWithGoogle,
} from '@/lib/auth-oauth';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';

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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { oauthError } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signIn');
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

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

  useEffect(() => {
    const callbackError = getOAuthCallbackError() ?? oauthError;
    if (!callbackError) return;

    form.setError('root', { message: callbackError });
    clearOAuthCallbackParams();
  }, [form, oauthError]);

  const handleGoogleSignIn = async () => {
    form.clearErrors('root');
    setIsOAuthLoading(true);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        form.setError('root', { message: error.message });
        setIsOAuthLoading(false);
      }
    } catch {
      form.setError('root', { message: t('auth:oauthFailed') });
      setIsOAuthLoading(false);
    }
  };

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
  const isBusy = isSubmitting || isOAuthLoading;

  return (
    <div className="app-gradient bg-surface relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

      <div className="animate-fade-in-up border-border bg-surface w-full max-w-md rounded-2xl border p-8 shadow-lg">
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

          <Button type="submit" className="w-full" disabled={isBusy}>
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

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="border-border w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs tracking-wide uppercase">
            <span className="bg-surface text-content-muted px-2">{t('auth:orContinueWith')}</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isBusy}
          onClick={() => void handleGoogleSignIn()}
        >
          {isOAuthLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common:loading')}
            </>
          ) : (
            <>
              <GoogleIcon />
              {t('auth:continueWithGoogle')}
            </>
          )}
        </Button>

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
