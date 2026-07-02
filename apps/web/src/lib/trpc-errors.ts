import { TRPCClientError } from '@trpc/client';
import type { TFunction } from 'i18next';

export function getTrpcErrorMessage(err: unknown, t: TFunction): string {
  if (err instanceof TRPCClientError) {
    switch (err.data?.code) {
      case 'CONFLICT':
        return t('errors:nameConflict');
      case 'NOT_FOUND':
        return t('errors:notFound');
      case 'FORBIDDEN':
        return t('errors:forbidden');
      case 'UNAUTHORIZED':
        return t('errors:unauthorized');
      case 'BAD_REQUEST':
        return err.message;
      default:
        break;
    }
  }

  if (err instanceof Error && err.message) {
    if (err.message.includes('uploaded before cloud storage')) {
      return t('errors:legacyFilePreview');
    }
    return err.message;
  }

  return t('common:error');
}
