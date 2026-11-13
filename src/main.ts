// Application bootstrap.
//
// Kept as a factory (createApp) so tests can boot an isolated Nest instance
// without binding a port.
import 'reflect-metadata';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { AppModule } from './app.module.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Behind Traefik the app sees a proxy; trust it so secure cookies work.
  app.set('trust proxy', 1);

  app.use(cookieParser());
  app.use(
    session({
      name: 'pingboard.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60, // 1 hour
      },
    }),
  );

  // Global validation. `transform` is on so DTO types are coerced, but note we
  // deliberately do NOT set `whitelist`/`forbidNonWhitelisted`: unknown and
  // forbidden fields are NOT stripped. That is the mass-assignment flaw — a
  // secure build would enable whitelist + forbidNonWhitelisted here AND keep
  // privilege fields out of the DTO entirely.
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  // Static single-page UI (served from dist/public at runtime).
  app.useStaticAssets(PUBLIC_DIR);

  return app;
}

async function bootstrap(): Promise<void> {
  const app = await createApp();
  await app.listen(config.port, '0.0.0.0');
  console.log(`pingboard listening on http://0.0.0.0:${config.port}`);
}

// Only auto-start when run directly (not when imported by tests).
if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('failed to start:', err);
    process.exit(1);
  });
}
