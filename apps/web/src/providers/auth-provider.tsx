import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearOAuthCallbackParams,
  getOAuthCallbackError,
  hasOAuthCodeInUrl,
} from '@/lib/auth-oauth';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  oauthError: string | null;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const OAUTH_WAIT_MS = 15_000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    let oauthWaitTimeout: ReturnType<typeof setTimeout> | undefined;

    const finishLoading = () => {
      if (mounted) setLoading(false);
    };

    const callbackError = getOAuthCallbackError();
    if (callbackError) {
      clearOAuthCallbackParams();
      setOauthError(callbackError);
      finishLoading();
      return;
    }

    const waitingForOAuthCode = hasOAuthCodeInUrl();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);

      if (
        nextSession &&
        (waitingForOAuthCode || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')
      ) {
        clearOAuthCallbackParams();
        if (oauthWaitTimeout) clearTimeout(oauthWaitTimeout);
        finishLoading();
        return;
      }

      if (!nextSession && event === 'SIGNED_OUT') {
        finishLoading();
      }
    });

    void (async () => {
      const {
        data: { session: nextSession },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (nextSession) {
        setSession(nextSession);
        if (waitingForOAuthCode) clearOAuthCallbackParams();
        finishLoading();
        return;
      }

      if (waitingForOAuthCode) {
        oauthWaitTimeout = setTimeout(() => {
          if (!mounted) return;
          clearOAuthCallbackParams();
          setOauthError('OAuth session timeout');
          finishLoading();
        }, OAUTH_WAIT_MS);
        return;
      }

      finishLoading();
    })();

    return () => {
      mounted = false;
      if (oauthWaitTimeout) clearTimeout(oauthWaitTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      oauthError,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading, oauthError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
