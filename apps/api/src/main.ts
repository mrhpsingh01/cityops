import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { json } from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';

const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) loadEnvFile(rootEnv);

// FRONTEND_URL (or legacy WEB_ORIGIN): comma-separated origins; `*` wildcards allowed,
// e.g. https://cityops.vercel.app,https://*.vercel.app for Vercel previews.
const allowedOrigins = (process.env.FRONTEND_URL ?? process.env.WEB_ORIGIN ?? 'http://localhost:3000')
  .split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
const matchesOrigin = (allowed: string, origin: string) => {
  if (!allowed.includes('*')) return allowed.toLowerCase() === origin.toLowerCase();
  const [head, tail] = [allowed.slice(0, allowed.indexOf('*')), allowed.slice(allowed.lastIndexOf('*') + 1)];
  const o = origin.toLowerCase();
  return o.startsWith(head.toLowerCase()) && o.endsWith(tail.toLowerCase()) && !o.slice(head.length, o.length - tail.length).includes('/');
};
const corsOrigin = (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) =>
  cb(null, !origin || allowedOrigins.some((a) => matchesOrigin(a, origin)));

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '32kb' }));
  app.use((req: any, _res: any, next: () => void) => {
    if (req.url === '/health') req.url = '/api/v1/health';
    if (req.url && req.url.startsWith('/api/') && !req.url.startsWith('/api/v1/')) {
      req.url = req.url.replace('/api/', '/api/v1/');
    }
    next();
  });
  app.enableCors({ origin: corsOrigin });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('CityOps REST API')
    .setDescription('Read-only NYC 311 request, metadata, health, and analytics endpoints')
    .setVersion('1.0')
    .build());
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: false });
  await app.listen(Number(process.env.PORT ?? process.env.API_PORT ?? 4000), '0.0.0.0');
}
void bootstrap();
