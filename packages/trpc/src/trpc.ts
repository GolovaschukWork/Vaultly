import { initTRPC } from '@trpc/server';
import { createUnauthorizedError, type TrpcContext } from './context';

export const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw createUnauthorizedError();
  }
  return next({
    ctx: {
      userId: ctx.userId,
      userEmail: ctx.userEmail,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
