# Security Policy

## 🔐 Handling Credentials and Secrets

This repository contains **NO hardcoded credentials**. All sensitive data must be stored in `.env` files (which are gitignored) or environment variables.

### Required Actions for Production Deployment

1. **SMTP Credentials** - Update in your `.env` file:
   ```
   SMTP_USER=your-actual-email@domain.com
   SMTP_PASS=your-app-specific-password
   ```

2. **JWT Secrets** - Generate strong random secrets (min 32 characters):
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Update `.env`:
   ```
   JWT_SECRET=<generated-secret-1>
   JWT_REFRESH_SECRET=<generated-secret-2>
   ```

3. **Admin Password** - Change the default admin password immediately after first login

4. **Database Password** - Use a strong password in production:
   ```
   DB_PASSWORD=strong-random-password-here
   ```

5. **Service Tokens** - Generate unique tokens for service-to-service communication:
   ```
   BACKEND_SERVICE_TOKEN=your-secure-random-token
   ```

### Email Configuration

This application was developed using Gmail SMTP for testing. For production:

1. Create a Gmail App Password (if using Gmail):
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a new app password
   - Use this password in `SMTP_PASS`

2. Or use your corporate SMTP server with appropriate credentials

### `.env` File Template

Copy `.env.example` to `.env` and fill in your actual values:

```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### Important Notes

- ⚠️ **NEVER commit `.env` files to git**
- ⚠️ **NEVER commit real credentials to the repository**
- ⚠️ **Always use environment variables in production**
- ⚠️ **Rotate credentials if accidentally exposed**

## Reporting Security Issues

If you discover a security vulnerability, please email: security@credit-agricole.it

**Do not** create public GitHub issues for security vulnerabilities.

## Recent Security Actions

- **2026-05-06**: Removed accidentally committed SMTP credentials from `.env.example`
- **2026-05-06**: Sanitized `_archive/helm-chart/values.yaml` default passwords
