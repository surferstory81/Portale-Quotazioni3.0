import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FailedAttempt {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number | null;
}

@Injectable()
export class IpBlockService {
  private readonly logger = new Logger(IpBlockService.name);
  private readonly attempts = new Map<string, FailedAttempt>();

  private readonly maxAttempts: number;
  private readonly blockDurationMs: number;
  private readonly windowMs: number;

  constructor(private readonly configService: ConfigService) {
    this.maxAttempts = this.configService.get<number>(
      'security.ipBlock.maxFailedAttempts',
      10,
    );
    this.blockDurationMs = this.configService.get<number>(
      'security.ipBlock.blockDurationMs',
      900_000,
    );
    this.windowMs = this.configService.get<number>(
      'security.ipBlock.windowMs',
      900_000,
    );

    // Periodic cleanup every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  isBlocked(ip: string): boolean {
    const record = this.attempts.get(ip);
    if (!record) return false;

    if (record.blockedUntil && Date.now() < record.blockedUntil) {
      return true;
    }

    // Block expired — reset
    if (record.blockedUntil && Date.now() >= record.blockedUntil) {
      this.attempts.delete(ip);
      return false;
    }

    return false;
  }

  getBlockRemainingMs(ip: string): number {
    const record = this.attempts.get(ip);
    if (!record?.blockedUntil) return 0;
    return Math.max(0, record.blockedUntil - Date.now());
  }

  recordFailedAttempt(ip: string): void {
    const now = Date.now();
    let record = this.attempts.get(ip);

    if (!record || now - record.firstAttemptAt > this.windowMs) {
      record = { count: 0, firstAttemptAt: now, blockedUntil: null };
    }

    record.count++;

    if (record.count >= this.maxAttempts) {
      record.blockedUntil = now + this.blockDurationMs;
      this.logger.warn(
        `IP ${ip} bloccato per ${this.blockDurationMs / 1000}s dopo ${record.count} tentativi falliti`,
      );
    }

    this.attempts.set(ip, record);
  }

  recordSuccess(ip: string): void {
    this.attempts.delete(ip);
  }

  getAttemptCount(ip: string): number {
    return this.attempts.get(ip)?.count || 0;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.attempts.entries()) {
      const expired =
        (record.blockedUntil && now >= record.blockedUntil) ||
        (!record.blockedUntil && now - record.firstAttemptAt > this.windowMs);

      if (expired) {
        this.attempts.delete(ip);
      }
    }
  }
}
