import { supabase } from '@/lib/supabase';

export function getOAuthRedirectUrl(): string {
  return `${window.location.origin}/login`;
}

export function hasOAuthCodeInUrl(): boolean {
  return new URLSearchParams(window.location.search).has('code');
}

export async function signInWithGoogle() {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getOAuthRedirectUrl(),
    },
  });
}

export function getOAuthCallbackError(): string | null {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  return (
    searchParams.get('error_description') ??
    hashParams.get('error_description') ??
    searchParams.get('error') ??
    hashParams.get('error')
  );
}

export function clearOAuthCallbackParams(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  url.searchParams.delete('error');
  url.searchParams.delete('error_description');
  url.searchParams.delete('error_code');
  url.hash = '';
  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
}
