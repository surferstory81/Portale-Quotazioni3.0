import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SsoEnabledGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(_context: ExecutionContext): boolean {
    const enabled = this.configService.get<boolean>('sso.enabled');
    if (!enabled) {
      throw new ServiceUnavailableException(
        'SSO non è abilitato. Impostare SSO_ENABLED=true per attivarlo.',
      );
    }
    return true;
  }
}
