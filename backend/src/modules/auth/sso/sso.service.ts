import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../../../entities/user.entity';
import { Role } from '../../../entities/role.entity';
import { RefreshToken } from '../../../entities/refresh-token.entity';
import { OidcClientService, OidcUserInfo } from './oidc-client.service';
import { JwtPayload } from '../strategies/jwt.strategy';

interface SsoSession {
  state: string;
  nonce: string;
  createdAt: number;
}

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  // In-memory store for pending SSO sessions (state → nonce).
  // In production consider Redis or a DB table for multi-instance setups.
  private readonly pendingSessions = new Map<string, SsoSession>();

  // Clean-up stale sessions every 10 minutes
  private readonly SESSION_TTL_MS = 10 * 60 * 1000;

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly oidcClient: OidcClientService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Periodically clean stale sessions
    setInterval(() => this.cleanStaleSessions(), this.SESSION_TTL_MS);
  }

  // ─── INITIATE SSO LOGIN ────────────────────────────────────
  initiateLogin(): { redirectUrl: string } {
    if (!this.oidcClient.isReady()) {
      throw new ServiceUnavailableException(
        'SSO provider non disponibile. Riprovare più tardi.',
      );
    }

    const state = this.oidcClient.generateState();
    const nonce = this.oidcClient.generateNonce();

    this.pendingSessions.set(state, {
      state,
      nonce,
      createdAt: Date.now(),
    });

    const redirectUrl = this.oidcClient.getAuthorizationUrl(state, nonce);

    return { redirectUrl };
  }

  // ─── HANDLE SSO CALLBACK ──────────────────────────────────
  async handleCallback(queryParams: Record<string, string>) {
    const { state } = queryParams;

    if (!state) {
      throw new BadRequestException('Parametro state mancante');
    }

    const session = this.pendingSessions.get(state);
    if (!session) {
      throw new BadRequestException(
        'Sessione SSO non trovata o scaduta. Riprovare il login.',
      );
    }

    this.pendingSessions.delete(state);

    if (!this.oidcClient.isReady()) {
      throw new ServiceUnavailableException(
        'SSO provider non disponibile.',
      );
    }

    const { userInfo } = await this.oidcClient.handleCallback(
      queryParams,
      session.state,
      session.nonce,
    );

    const email = this.extractEmail(userInfo);
    if (!email) {
      throw new BadRequestException(
        "L'Identity Provider non ha fornito un'email valida.",
      );
    }

    const user = await this.findOrCreateUser(email, userInfo);

    const tokens = await this.generateTokens(user);

    const frontendRedirect = this.configService.get<string>(
      'sso.frontendRedirectUrl',
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      redirectUrl: `${frontendRedirect}?accessToken=${encodeURIComponent(tokens.accessToken)}&refreshToken=${encodeURIComponent(tokens.refreshToken)}`,
      user: {
        id: user.id,
        matricola: user.matricola,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  // ─── FIND OR CREATE USER ──────────────────────────────────
  private async findOrCreateUser(
    email: string,
    userInfo: OidcUserInfo,
  ): Promise<User> {
    let user = await this.userRepo.findOne({
      where: { email },
      relations: ['role'],
    });

    if (user) {
      this.logger.log(`SSO login utente esistente: ${email}`);
      return user;
    }

    // Auto-provision new user
    const defaultRoleName = this.configService.get<string>(
      'sso.defaultRole',
      'USER',
    );
    const role = await this.roleRepo.findOne({
      where: { name: defaultRoleName },
    });

    if (!role) {
      throw new BadRequestException(
        `Ruolo di default "${defaultRoleName}" non trovato nel sistema`,
      );
    }

    // Generate a unique matricola from SSO sub or email prefix
    const matricolaBase =
      userInfo.preferred_username?.toUpperCase() ||
      email.split('@')[0].toUpperCase();
    let matricola = `SSO-${matricolaBase}`.substring(0, 50);

    // Ensure uniqueness
    const existing = await this.userRepo.findOne({ where: { matricola } });
    if (existing) {
      matricola = `SSO-${matricolaBase}-${uuidv4().substring(0, 6)}`.substring(
        0,
        50,
      );
    }

    user = this.userRepo.create({
      email,
      matricola,
      passwordHash: '$$SSO_NO_PASSWORD$$', // SSO users don't have a local password
      isVerified: true, // SSO-verified by the IdP
      authProvider: 'sso',
      role,
    });

    const saved = await this.userRepo.save(user);
    this.logger.log(`Nuovo utente SSO creato: ${email} (${matricola})`);

    // Re-fetch with role relation
    return this.userRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['role'],
    });
  }

  // ─── HELPERS ───────────────────────────────────────────────

  private extractEmail(userInfo: OidcUserInfo): string | undefined {
    return (
      userInfo.email ||
      (typeof userInfo.preferred_username === 'string' &&
      userInfo.preferred_username.includes('@')
        ? userInfo.preferred_username
        : undefined)
    );
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '15m'),
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ),
      },
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshTokenEntity = this.refreshTokenRepo.create({
      token: refreshToken,
      userId: user.id,
      expiresAt,
    });
    await this.refreshTokenRepo.save(refreshTokenEntity);

    return { accessToken, refreshToken };
  }

  private cleanStaleSessions(): void {
    const now = Date.now();
    for (const [key, session] of this.pendingSessions.entries()) {
      if (now - session.createdAt > this.SESSION_TTL_MS) {
        this.pendingSessions.delete(key);
      }
    }
  }
}
