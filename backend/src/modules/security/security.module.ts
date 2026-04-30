import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { Log } from '../../entities/log.entity';
import securityConfig from '../../config/security.config';

import { IpBlockService } from './ip-block.service';
import { SecurityLogService } from './security-log.service';
import { IpBlockMiddleware } from './ip-block.middleware';
import { XssProtectionMiddleware } from './xss-protection.middleware';

@Module({
  imports: [
    ConfigModule.forFeature(securityConfig),
    TypeOrmModule.forFeature([Log]),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'global',
          ttl: configService.get<number>(
            'security.rateLimitGlobal.ttl',
            60_000,
          ),
          limit: configService.get<number>(
            'security.rateLimitGlobal.limit',
            100,
          ),
        },
      ],
    }),
  ],
  providers: [
    IpBlockService,
    SecurityLogService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [IpBlockService, SecurityLogService],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(IpBlockMiddleware)
      .forRoutes('auth/login', 'auth/register', 'auth/forgot-password');

    consumer
      .apply(XssProtectionMiddleware)
      .forRoutes('*');
  }
}
