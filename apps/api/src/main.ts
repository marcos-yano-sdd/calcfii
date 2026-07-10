import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({
    logger: {
      redact: ['req.headers.authorization', 'req.headers.cookie', 'authorization', 'cookie'],
    },
  }));

  const origins = (process.env.APP_ALLOWED_ORIGINS ?? 'http://localhost:4200').split(',');
  await app.register(helmet);
  await app.register(cors, { origin: origins, credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000, '0.0.0.0');
}

void bootstrap();
