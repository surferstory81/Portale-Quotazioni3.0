import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from '../../../entities/user.entity';
import { Role } from '../../../entities/role.entity';
import { RefreshToken } from '../../../entities/refresh-token.entity';

import { OidcClientService } from './oidc-client.service';
import { SsoService } from './sso.service';
import { SsoController } from './sso.controller';
import ssoConfig from '../../../config/sso.config';

@Module({
  imports: [
    ConfigModule.forFeature(ssoConfig),
    TypeOrmModule.forFeature([User, Role, RefreshToken]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
        },
      }),
    }),
  ],
  controllers: [SsoController],
  providers: [OidcClientService, SsoService],
  exports: [SsoService, OidcClientService],
})
export class SsoModule {}
