import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Issuer, Client, generators, TokenSet } from 'openid-client';

export interface OidcUserInfo {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

@Injectable()
export class OidcClientService implements OnModuleInit {
  private readonly logger = new Logger(OidcClientService.name);
  private client: Client | null = null;
  private issuerUrl: string;
  private clientId: string;
  private clientSecret: string;
  private callbackUrl: string;
  private scopes: string[];
  private enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('sso.enabled', false);
    this.issuerUrl = this.configService.get<string>('sso.issuer', '');
    this.clientId = this.configService.get<string>('sso.clientId', '');
    this.clientSecret = this.configService.get<string>('sso.clientSecret', '');
    this.callbackUrl = this.configService.get<string>('sso.callbackUrl', '');
    this.scopes = this.configService.get<string[]>('sso.scopes', [
      'openid',
      'profile',
      'email',
    ]);
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      this.logger.log('SSO disabilitato — skip discovery OIDC');
      return;
    }

    try {
      this.logger.log(`OIDC discovery da: ${this.issuerUrl}`);
      const issuer = await Issuer.discover(this.issuerUrl);
      this.logger.log(`Issuer trovato: ${issuer.metadata.issuer}`);

      this.client = new issuer.Client({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uris: [this.callbackUrl],
        response_types: ['code'],
      });

      this.logger.log('Client OIDC configurato con successo');
    } catch (error) {
      this.logger.error(
        'Errore durante la discovery OIDC. SSO non disponibile.',
        (error as Error).stack,
      );
      this.client = null;
    }
  }

  isReady(): boolean {
    return this.enabled && this.client !== null;
  }

  generateState(): string {
    return generators.state();
  }

  generateNonce(): string {
    return generators.nonce();
  }

  getAuthorizationUrl(state: string, nonce: string): string {
    if (!this.client) {
      throw new Error('Client OIDC non inizializzato');
    }

    return this.client.authorizationUrl({
      scope: this.scopes.join(' '),
      state,
      nonce,
      response_type: 'code',
    });
  }

  async handleCallback(
    callbackParams: Record<string, string>,
    state: string,
    nonce: string,
  ): Promise<{ tokenSet: TokenSet; userInfo: OidcUserInfo }> {
    if (!this.client) {
      throw new Error('Client OIDC non inizializzato');
    }

    const params = this.client.callbackParams({
      method: 'GET',
      url: `${this.callbackUrl}?${new URLSearchParams(callbackParams).toString()}`,
    } as any);

    const tokenSet = await this.client.callback(this.callbackUrl, params, {
      state,
      nonce,
    });

    const userInfo = (await this.client.userinfo(tokenSet)) as OidcUserInfo;

    return { tokenSet, userInfo };
  }
}
