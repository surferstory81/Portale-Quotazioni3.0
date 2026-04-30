import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  enabled: process.env.EMAIL_ENABLED === 'true',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'Portale Quotazioni <no-reply@quotazioni.local>',
  },
  links: {
    appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:4200',
  },
  notifications: {
    adminRecipients: (process.env.EMAIL_ADMIN_RECIPIENTS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  },
}));
