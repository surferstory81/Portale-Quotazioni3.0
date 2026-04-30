import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { EmailVerificationToken } from '../../entities/email-verification-token.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ResendVerificationDto,
} from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { IpBlockService } from '../security/ip-block.service';
import {
  SecurityLogService,
  SecurityAction,
} from '../security/security-log.service';
import { EmailService } from '../email/email.service';

export interface RequestContext {
  ip: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(EmailVerificationToken)
    private readonly emailTokenRepo: Repository<EmailVerificationToken>,
    @InjectRepository(PasswordResetToken)
    private readonly passwordResetRepo: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly ipBlockService: IpBlockService,
    private readonly securityLogService: SecurityLogService,
    private readonly emailService: EmailService,
  ) {}

  // ─── REGISTER ──────────────────────────────────────────────
  async register(dto: RegisterDto, ctx?: RequestContext) {
    const ip = ctx?.ip || 'unknown';
    const userAgent = ctx?.userAgent;

    const existingEmail = await this.userRepo.findOne({
      where: { email: dto.email },
    });
    if (existingEmail) {
      throw new ConflictException('Email già registrata');
    }

    const existingMatricola = await this.userRepo.findOne({
      where: { matricola: dto.matricola },
    });
    if (existingMatricola) {
      throw new ConflictException('Matricola già registrata');
    }

    const userRole = await this.roleRepo.findOne({ where: { name: 'USER' } });
    if (!userRole) {
      throw new BadRequestException('Ruolo USER non trovato nel sistema');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = this.userRepo.create({
      matricola: dto.matricola,
      email: dto.email,
      passwordHash,
      isVerified: false,
      role: userRole,
    });

    const savedUser = await this.userRepo.save(user);

    // Generate email verification token
    const verificationToken = await this.createEmailVerificationToken(
      savedUser.id,
    );

    await this.securityLogService.log({
      action: SecurityAction.REGISTER,
      ip,
      userAgent,
      email: savedUser.email,
      userId: savedUser.id,
    });

    this.logger.log(
      `Utente registrato: ${savedUser.email} — token verifica: ${verificationToken.token}`,
    );

    await this.emailService.sendVerificationEmail(
      savedUser,
      verificationToken.token,
    );

    return {
      message:
        'Registrazione completata. Controlla la tua email per verificare l\'account.',
      verificationToken: verificationToken.token, // in produzione inviare via email
    };
  }

  // ─── VERIFY EMAIL ──────────────────────────────────────────
  async verifyEmail(token: string, ctx?: RequestContext) {
    const record = await this.emailTokenRepo.findOne({
      where: {
        token,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!record) {
      throw new BadRequestException('Token non valido o scaduto');
    }

    record.isUsed = true;
    await this.emailTokenRepo.save(record);

    record.user.isVerified = true;
    await this.userRepo.save(record.user);

    await this.securityLogService.log({
      action: SecurityAction.EMAIL_VERIFIED,
      ip: ctx?.ip || 'unknown',
      userAgent: ctx?.userAgent,
      email: record.user.email,
      userId: record.user.id,
    });

    return { message: 'Email verificata con successo' };
  }

  // ─── LOGIN ─────────────────────────────────────────────────
  async login(dto: LoginDto, ctx?: RequestContext) {
    const ip = ctx?.ip || 'unknown';
    const userAgent = ctx?.userAgent;

    const user = await this.userRepo.findOne({
      where: { email: dto.email },
      relations: ['role'],
    });

    if (!user) {
      this.ipBlockService.recordFailedAttempt(ip);
      await this.securityLogService.log({
        action: SecurityAction.LOGIN_FAILED,
        ip,
        userAgent,
        email: dto.email,
        details: { reason: 'user_not_found' },
      });
      throw new UnauthorizedException('Credenziali non valide');
    }

    if (user.authProvider === 'sso') {
      await this.securityLogService.log({
        action: SecurityAction.LOGIN_BLOCKED_SSO,
        ip,
        userAgent,
        email: dto.email,
        userId: user.id,
      });
      throw new UnauthorizedException(
        'Questo account utilizza SSO. Effettua il login tramite /auth/sso/login.',
      );
    }

    if (user.isBlocked) {
      await this.securityLogService.log({
        action: SecurityAction.LOGIN_FAILED,
        ip,
        userAgent,
        email: dto.email,
        userId: user.id,
        details: { reason: 'user_blocked' },
      });
      throw new UnauthorizedException('Utente bloccato. Contatta un amministratore.');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      this.ipBlockService.recordFailedAttempt(ip);
      await this.securityLogService.log({
        action: SecurityAction.LOGIN_FAILED,
        ip,
        userAgent,
        email: dto.email,
        userId: user.id,
        details: { reason: 'invalid_password' },
      });
      throw new UnauthorizedException('Credenziali non valide');
    }

    if (!user.isVerified) {
      await this.securityLogService.log({
        action: SecurityAction.LOGIN_BLOCKED_UNVERIFIED,
        ip,
        userAgent,
        email: dto.email,
        userId: user.id,
      });
      throw new UnauthorizedException(
        'Email non verificata. Controlla la tua casella di posta.',
      );
    }

    // Successful login — reset IP block counter
    this.ipBlockService.recordSuccess(ip);

    await this.securityLogService.log({
      action: SecurityAction.LOGIN_SUCCESS,
      ip,
      userAgent,
      email: user.email,
      userId: user.id,
    });

    const tokens = await this.generateTokens(user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        matricola: user.matricola,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  // ─── REFRESH TOKEN ─────────────────────────────────────────
  async refreshAccessToken(refreshTokenValue: string) {
    const stored = await this.refreshTokenRepo.findOne({
      where: {
        token: refreshTokenValue,
        isRevoked: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user', 'user.role'],
    });

    if (!stored) {
      throw new UnauthorizedException('Refresh token non valido o scaduto');
    }

    // Revoke old refresh token (rotation)
    stored.isRevoked = true;
    await this.refreshTokenRepo.save(stored);

    const tokens = await this.generateTokens(stored.user);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ─── FORGOT PASSWORD ──────────────────────────────────────
  async forgotPassword(dto: ForgotPasswordDto, ctx?: RequestContext) {
    const ip = ctx?.ip || 'unknown';
    const userAgent = ctx?.userAgent;

    const user = await this.userRepo.findOne({
      where: { email: dto.email },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      await this.securityLogService.log({
        action: SecurityAction.PASSWORD_RESET_REQUEST,
        ip,
        userAgent,
        email: dto.email,
        details: { found: false },
      });
      return {
        message:
          'Se l\'email è registrata, riceverai le istruzioni per reimpostare la password.',
      };
    }

    const resetToken = await this.createPasswordResetToken(user.id);

    await this.securityLogService.log({
      action: SecurityAction.PASSWORD_RESET_REQUEST,
      ip,
      userAgent,
      email: user.email,
      userId: user.id,
    });

    this.logger.log(
      `Password reset richiesto per ${user.email} — token: ${resetToken.token}`,
    );

    await this.emailService.sendPasswordResetEmail(user, resetToken.token);

    return {
      message:
        'Se l\'email è registrata, riceverai le istruzioni per reimpostare la password.',
      resetToken: resetToken.token, // in produzione inviare via email
    };
  }

  // ─── RESEND VERIFICATION ──────────────────────────────────
  async resendVerification(dto: ResendVerificationDto, ctx?: RequestContext) {
    const ip = ctx?.ip || 'unknown';
    const userAgent = ctx?.userAgent;

    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // Always return the same response to prevent email enumeration
    const genericMessage =
      'Se l\'email è registrata e non ancora verificata, riceverai un nuovo link di verifica.';

    if (!user || user.isVerified) {
      return { message: genericMessage };
    }

    // Invalidate previous verification tokens for this user
    await this.emailTokenRepo.update(
      { userId: user.id, isUsed: false },
      { isUsed: true },
    );

    const verificationToken = await this.createEmailVerificationToken(user.id);

    await this.securityLogService.log({
      action: SecurityAction.EMAIL_VERIFICATION_RESENT,
      ip,
      userAgent,
      email: user.email,
      userId: user.id,
    });

    this.logger.log(`Verifica email reinviata a ${user.email} — token: ${verificationToken.token}`);

    await this.emailService.sendVerificationEmail(user, verificationToken.token);

    return {
      message: genericMessage,
      verificationToken: verificationToken.token, // solo in dev — in prod arriva via email
    };
  }

  // ─── RESET PASSWORD ───────────────────────────────────────
  async resetPassword(dto: ResetPasswordDto, ctx?: RequestContext) {
    const record = await this.passwordResetRepo.findOne({
      where: {
        token: dto.token,
        isUsed: false,
        expiresAt: MoreThan(new Date()),
      },
      relations: ['user'],
    });

    if (!record) {
      throw new BadRequestException('Token non valido o scaduto');
    }

    record.isUsed = true;
    await this.passwordResetRepo.save(record);

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    record.user.passwordHash = passwordHash;
    await this.userRepo.save(record.user);

    // Revoke all refresh tokens for security
    await this.refreshTokenRepo.update(
      { userId: record.user.id, isRevoked: false },
      { isRevoked: true },
    );

    await this.securityLogService.log({
      action: SecurityAction.PASSWORD_RESET_COMPLETE,
      ip: ctx?.ip || 'unknown',
      userAgent: ctx?.userAgent,
      email: record.user.email,
      userId: record.user.id,
    });

    return { message: 'Password reimpostata con successo' };
  }

  // ─── LOGOUT ────────────────────────────────────────────────
  async logout(refreshTokenValue: string, ctx?: RequestContext) {
    const stored = await this.refreshTokenRepo.findOne({
      where: { token: refreshTokenValue },
      relations: ['user'],
    });

    if (stored) {
      stored.isRevoked = true;
      await this.refreshTokenRepo.save(stored);

      await this.securityLogService.log({
        action: SecurityAction.LOGOUT,
        ip: ctx?.ip || 'unknown',
        userAgent: ctx?.userAgent,
        email: stored.user?.email,
        userId: stored.userId,
      });
    }

    return { message: 'Logout effettuato' };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────

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

    // Store refresh token in DB
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

  private async createEmailVerificationToken(userId: string) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24h validity

    const entity = this.emailTokenRepo.create({
      token,
      userId,
      expiresAt,
    });

    return this.emailTokenRepo.save(entity);
  }

  private async createPasswordResetToken(userId: string) {
    // Invalidate existing tokens
    await this.passwordResetRepo.update(
      { userId, isUsed: false },
      { isUsed: true },
    );

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1h validity

    const entity = this.passwordResetRepo.create({
      token,
      userId,
      expiresAt,
    });

    return this.passwordResetRepo.save(entity);
  }
}
