import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';
import { getTrpcErrorMessage } from '@/lib/trpc-errors';

export function useTrpcToast() {
  const { t } = useTranslation();

  const showError = useCallback(
    (titleKey: string, err: unknown) => {
      toast({
        title: t(titleKey),
        description: getTrpcErrorMessage(err, t),
        variant: 'destructive',
      });
    },
    [t],
  );

  return showError;
}
