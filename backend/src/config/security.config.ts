import { registerAs } from '@nestjs/config';

export default registerAs('security', () => ({
  // ─── Rate limiting ─────────────────────────────
  rateLimitGlobal: {
    ttl: parseInt(process.env.RATE_LIMIT_GLOBAL_TTL || '60000', 10),   // window in ms
    limit: parseInt(process.env.RATE_LIMIT_GLOBAL_LIMIT || '100', 10), // max requests per window
  },
  rateLimitLogin: {
    ttl: parseInt(process.env.RATE_LIMIT_LOGIN_TTL || '60000', 10),
    limit: parseInt(process.env.RATE_LIMIT_LOGIN_LIMIT || '5', 10),
  },
  rateLimitRegister: {
    ttl: parseInt(process.env.RATE_LIMIT_REGISTER_TTL || '60000', 10),
    limit: parseInt(process.env.RATE_LIMIT_REGISTER_LIMIT || '3', 10),
  },

  // ─── IP blocking ──────────────────────────────
  ipBlock: {
    maxFailedAttempts: parseInt(process.env.IP_BLOCK_MAX_ATTEMPTS || '10', 10),
    blockDurationMs: parseInt(process.env.IP_BLOCK_DURATION_MS || '900000', 10), // 15 min
    windowMs: parseInt(process.env.IP_BLOCK_WINDOW_MS || '900000', 10),          // 15 min
  },

  // ─── CORS ─────────────────────────────────────
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods: process.env.CORS_METHODS || 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
}));
