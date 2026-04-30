import { Throttle } from '@nestjs/throttler';

/**
 * Rate limit: max 5 requests per minute for login endpoints.
 */
export const ThrottleLogin = () => Throttle({ global: { ttl: 60000, limit: 5 } });

/**
 * Rate limit: max 3 requests per minute for registration endpoints.
 */
export const ThrottleRegister = () => Throttle({ global: { ttl: 60000, limit: 3 } });

/**
 * Rate limit: max 3 requests per minute for password reset.
 */
export const ThrottlePasswordReset = () => Throttle({ global: { ttl: 60000, limit: 3 } });
