import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { trpc } from '@/lib/trpc';
import { supabase } from '@/lib/supabase';
import '@/lib/i18n';
import { Toaster } from '@/components/toaster';
import { AuthProvider } from '@/providers/auth-provider';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  return 'http://localhost:3001';
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            retry: 3,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/trpc`,
          async headers() {
            const {
              data: { session },
            } = await supabase.auth.getSession();
            const token = session?.access_token;
            return token ? { Authorization: `Bearer ${token}` } : {};
          },
        }),
      ],
    }),
  );

  return (
    <AuthProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            {children}
            <Toaster />
          </ThemeProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </AuthProvider>
  );
}
