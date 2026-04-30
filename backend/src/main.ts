
import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe, LoggerService } from '@nestjs/common';
import { FileLogger } from './file-logger';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

class DualLogger implements LoggerService {
  private readonly fileLogger = new FileLogger();

  // Use process.stdout directly — avoids re-entering the global NestJS logger
  // which would cause infinite recursion (DualLogger → Logger('Nest') → DualLogger → ...)
  log(message: unknown, ...params: unknown[]): void {
    const line = this.format('LOG', message, params);
    process.stdout.write(line + '\n');
    this.safeFileWrite(line);
  }
  error(message: unknown, ...params: unknown[]): void {
    const line = this.format('ERROR', message, params);
    process.stderr.write(line + '\n');
    this.safeFileWrite(line);
  }
  warn(message: unknown, ...params: unknown[]): void {
    const line = this.format('WARN', message, params);
    process.stdout.write(line + '\n');
    this.safeFileWrite(line);
  }
  debug(message: unknown, ...params: unknown[]): void {
    const line = this.format('DEBUG', message, params);
    process.stdout.write(line + '\n');
    this.safeFileWrite(line);
  }
  verbose(message: unknown, ...params: unknown[]): void {
    const line = this.format('VERBOSE', message, params);
    process.stdout.write(line + '\n');
    this.safeFileWrite(line);
  }

  private format(level: string, message: unknown, params: unknown[]): string {
    const msg = typeof message === 'string' ? message : JSON.stringify(message);
    const extra = params.map(p => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ');
    return `[Nest] ${level} ${new Date().toISOString()} ${msg}${extra ? ' ' + extra : ''}`;
  }

  private safeFileWrite(line: string): void {
    try {
      this.fileLogger.log(line);
    } catch {
      // file logging is best-effort — never crash NestJS
    }
  }
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: new DualLogger(),
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
