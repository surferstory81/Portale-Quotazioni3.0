
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { FileLoggerService } from './common/logger/file-logger.service';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const fileLogger = new FileLoggerService();

  const app = await NestFactory.create(AppModule, {
    logger: fileLogger,
  });
  const configService = app.get(ConfigService);

  // ─── Helmet: security headers ──────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'same-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      ieNoOpen: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true,
    }),
  );

  // ─── CORS ──────────────────────────────────────────────────
  const corsOrigin = configService.get<string>(
    'security.cors.origin',
    'http://localhost:4200',
  );
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    methods: configService.get<string>(
      'security.cors.methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE',
    ),
    credentials: configService.get<boolean>('security.cors.credentials', false),
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-RateLimit-Remaining', 'Retry-After'],
  });

  // ─── Validation ────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Swagger / OpenAPI ─────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Portale Quotazioni Infrastrutturali')
    .setDescription(
      'API interna per la gestione delle richieste di quotazione IT. ' +
      'Tutti gli endpoint richiedono autenticazione JWT (Bearer token) ' +
      'ad eccezione di /auth/login e /auth/register.',
    )
    .setVersion('2.0')
    .addBearerAuth()
    .addTag('auth',       'Autenticazione e gestione sessioni')
    .addTag('quotations', 'Quotazioni utente (create, lista, aggiornamento)')
    .addTag('admin',      'Pannello amministratore (solo ruolo ADMIN)')
    .addTag('health',     'Health check applicazione')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // ─── Trust proxy (for correct IP behind reverse proxy) ─────
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  const port = process.env.APP_PORT || 3000;
  await app.listen(port);
  logger.log(`Applicazione avviata su http://localhost:${port}`);
  logger.log(`Swagger UI disponibile su http://localhost:${port}/api`);
}

bootstrap();
