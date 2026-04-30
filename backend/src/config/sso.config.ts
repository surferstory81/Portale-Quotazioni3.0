import { registerAs } from '@nestjs/config';

export default registerAs('sso', () => ({
  enabled: process.env.SSO_ENABLED === 'true',

  // OpenID Connect discovery URL (e.g. Azure AD, Keycloak, Auth0, etc.)
  // Azure AD example: https://login.microsoftonline.com/{tenant-id}/v2.0
  issuer: process.env.SSO_ISSUER || '',

  clientId: process.env.SSO_CLIENT_ID || '',
  clientSecret: process.env.SSO_CLIENT_SECRET || '',

  // Where the IdP will redirect after login
  callbackUrl:
    process.env.SSO_CALLBACK_URL || 'http://localhost:3000/auth/sso/callback',

  // Where to redirect the user's browser after SSO flow completes
  frontendRedirectUrl:
    process.env.SSO_FRONTEND_REDIRECT_URL || 'http://localhost:4200/sso/callback',

  // Scopes requested from the provider
  scopes: (process.env.SSO_SCOPES || 'openid profile email').split(' '),

  // Default role assigned to SSO-provisioned users
  defaultRole: process.env.SSO_DEFAULT_ROLE || 'USER',
}));
