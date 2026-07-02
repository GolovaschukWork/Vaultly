import { INestApplication } from '@nestjs/common';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import * as express from 'express';
import { appRouter } from './router';
import { createContext } from './context';

export function setupTrpc(app: INestApplication) {
  const expressApp = app.getHttpAdapter().getInstance() as express.Application;

  expressApp.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );
}
