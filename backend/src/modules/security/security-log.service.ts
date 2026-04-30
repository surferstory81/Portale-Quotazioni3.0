import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log } from '../../entities/log.entity';

export enum SecurityAction {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_BLOCKED_SSO = 'LOGIN_BLOCKED_SSO',
  LOGIN_BLOCKED_UNVERIFIED = 'LOGIN_BLOCKED_UNVERIFIED',
  REGISTER = 'REGISTER',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_COMPLETE = 'PASSWORD_RESET_COMPLETE',
  EMAIL_VERIFIED = 'EMAIL_VERIFIED',
  EMAIL_VERIFICATION_RESENT = 'EMAIL_VERIFICATION_RESENT',
  IP_BLOCKED = 'IP_BLOCKED',
  RATE_LIMITED = 'RATE_LIMITED',
  SSO_LOGIN = 'SSO_LOGIN',
  SSO_USER_CREATED = 'SSO_USER_CREATED',
}

export interface SecurityLogData {
  action: SecurityAction;
  ip: string;
  userAgent?: string;
  email?: string;
  userId?: string;
  details?: Record<string, any>;
}

@Injectable()
export class SecurityLogService {
  private readonly logger = new Logger(SecurityLogService.name);

  constructor(
    @InjectRepository(Log)
    private readonly logRepo: Repository<Log>,
  ) {}

  async log(data: SecurityLogData): Promise<void> {
    try {
      const logEntry = this.logRepo.create({
        action: data.action,
        entity: 'auth',
        entityId: data.userId || undefined,
        payload: {
          ip: data.ip,
          userAgent: data.userAgent,
          email: data.email,
          ...data.details,
        },
      });

      await this.logRepo.save(logEntry);

      // Also log to console for critical events
      if (
        data.action === SecurityAction.LOGIN_FAILED ||
        data.action === SecurityAction.IP_BLOCKED ||
        data.action === SecurityAction.RATE_LIMITED
      ) {
        this.logger.warn(
          `[${data.action}] IP: ${data.ip} | Email: ${data.email || 'N/A'} | ${
            data.details ? JSON.stringify(data.details) : ''
          }`,
        );
      }
    } catch (error) {
      // Security logging should never crash the request
      this.logger.error(
        'Errore durante il security logging',
        (error as Error).stack,
      );
    }
  }
}
