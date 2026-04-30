import {
  Injectable,
  NestMiddleware,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { IpBlockService } from './ip-block.service';
import { SecurityLogService, SecurityAction } from './security-log.service';

@Injectable()
export class IpBlockMiddleware implements NestMiddleware {
  private readonly logger = new Logger(IpBlockMiddleware.name);

  constructor(
    private readonly ipBlockService: IpBlockService,
    private readonly securityLogService: SecurityLogService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const ip = this.extractIp(req);

    if (this.ipBlockService.isBlocked(ip)) {
      const remainingMs = this.ipBlockService.getBlockRemainingMs(ip);
      const remainingSec = Math.ceil(remainingMs / 1000);

      this.securityLogService.log({
        action: SecurityAction.IP_BLOCKED,
        ip,
        userAgent: req.headers['user-agent'],
        details: {
          blockedEndpoint: req.originalUrl,
          remainingSeconds: remainingSec,
        },
      });

      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: `IP temporaneamente bloccato. Riprovare tra ${remainingSec} secondi.`,
        retryAfter: remainingSec,
      });
      return;
    }

    next();
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  }
}
