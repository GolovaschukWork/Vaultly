import { config } from 'dotenv';
import { resolve } from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupTrpc } from './trpc/trpc.setup';

if (process.env.NODE_ENV !== 'production') {
  config({ path: resolve(__dirname, '../.env') });
}

function getCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGIN?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (fromEnv?.length) return fromEnv;

  return ['http://localhost:5173', 'http://localhost:4173'];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });

  setupTrpc(app);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
}

bootstrap();
