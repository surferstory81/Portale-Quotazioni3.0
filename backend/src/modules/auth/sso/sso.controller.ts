import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { SsoService } from './sso.service';
import { SsoEnabledGuard } from '../guards/sso-enabled.guard';

@Controller('auth/sso')
@UseGuards(SsoEnabledGuard)
export class SsoController {
  private readonly logger = new Logger(SsoController.name);

  constructor(private readonly ssoService: SsoService) {}

  /**
   * GET /auth/sso/login
   * Redirects the browser to the OIDC provider's authorization page.
   */
  @Get('login')
  login(@Res() res: Response): void {
    const { redirectUrl } = this.ssoService.initiateLogin();
    this.logger.log('SSO login avviato — redirect al provider');
    res.redirect(HttpStatus.FOUND, redirectUrl);
  }

  /**
   * GET /auth/sso/callback
   * Handles the redirect back from the IdP, exchanges code for tokens,
   * provisions user if needed, then redirects browser to frontend with JWT.
   */
  @Get('callback')
  async callback(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const result = await this.ssoService.handleCallback(query);

      this.logger.log(`SSO callback completato per: ${result.user.email}`);

      // Redirect to frontend with tokens
      res.redirect(HttpStatus.FOUND, result.redirectUrl);
    } catch (error) {
      this.logger.error(
        'Errore SSO callback',
        (error as Error).stack,
      );

      const frontendError =
        process.env.SSO_FRONTEND_REDIRECT_URL ||
        'http://localhost:4200/sso/callback';

      res.redirect(
        HttpStatus.FOUND,
        `${frontendError}?error=${encodeURIComponent((error as Error).message)}`,
      );
    }
  }

  /**
   * GET /auth/sso/status
   * Returns whether SSO is available and configured.
   */
  @Get('status')
  status() {
    return {
      ssoEnabled: true, // if we reach here, SsoEnabledGuard already passed
      message: 'SSO è attivo e configurato',
    };
  }
}
