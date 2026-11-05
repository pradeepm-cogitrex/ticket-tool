import 'dotenv/config';
import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';
import { ensureDatabase } from './config/ensure-database';
import { migrateLegacySchema } from './config/migrate-legacy';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Creates the MySQL database (DB_DATABASE) if it does not exist yet.
  await ensureDatabase();
  // Renames tables and columns from older versions so synchronize keeps their data.
  await migrateLegacySchema();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // HelpX widget: the script is served from /static/helpx-bot/helpx-bot.js ...
  app.useStaticAssets(join(process.cwd(), 'public'), { prefix: '/static/' });
  // ... and its API is called from the customer's own website, so any origin may use it
  app.use('/api/widget', (req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  logger.log(`TicketDesk API running on http://localhost:${port}/api`);
}

bootstrap();
