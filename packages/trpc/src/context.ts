import { TRPCError } from '@trpc/server';

export type TrpcContext = {
  userId: string | null;
  userEmail: string | null;
};

export function createUnauthorizedError(message = 'Unauthorized') {
  return new TRPCError({
    code: 'UNAUTHORIZED',
    message,
  });
}
