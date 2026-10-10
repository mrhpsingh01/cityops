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

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '32kb' }));
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api/v1');
  app.enableShutdownHooks();
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('CityOps REST API')
    .setDescription('Read-only NYC 311 request, metadata, health, and analytics endpoints')
    .setVersion('1.0')
    .build());
  SwaggerModule.setup('docs', app, document, { useGlobalPrefix: false });
  await app.listen(Number(process.env.API_PORT ?? 4000));
}
void bootstrap();
