import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { EmailVerificationToken } from '../../entities/email-verification-token.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { IpBlockService } from '../security/ip-block.service';
import { SecurityLogService } from '../security/security-log.service';
import { EmailService } from '../email/email.service';

// ── helpers ───────────────────────────────────────────────────────────────────

const userRole = (): Role => ({ id: 1, name: 'USER', description: '', createdAt: new Date(), users: [] });

const verifiedUser = (override: Partial<User> = {}): User => ({
  id: 'user-1',
  matricola: 'MAT001',
  email: 'user@test.it',
  passwordHash: bcrypt.hashSync('Password1!', 1),
  isVerified: true,
  isBlocked: false,
  blockedAt: null,
  authProvider: 'local',
  role: userRole(),
  createdAt: new Date(),
  quotations: [],
  assignedQuotations: [],
  ...override,
} as User);

const mockRepo = () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  })),
});

// ── suite ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: ReturnType<typeof mockRepo>;
  let roleRepo: ReturnType<typeof mockRepo>;
  let emailTokenRepo: ReturnType<typeof mockRepo>;
  let passwordResetRepo: ReturnType<typeof mockRepo>;
  let refreshTokenRepo: ReturnType<typeof mockRepo>;
  let emailService: { sendVerificationEmail: jest.Mock; sendNewQuotationEmail: jest.Mock };
  let securityLogService: { log: jest.Mock };
  let ipBlockService: { recordFailedAttempt: jest.Mock; isBlocked: jest.Mock };

  beforeEach(async () => {
    userRepo = mockRepo();
    roleRepo = mockRepo();
    emailTokenRepo = mockRepo();
    passwordResetRepo = mockRepo();
    refreshTokenRepo = mockRepo();
    emailService = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined), sendNewQuotationEmail: jest.fn() };
    securityLogService = { log: jest.fn().mockResolvedValue(undefined) };
    ipBlockService = { recordFailedAttempt: jest.fn(), recordSuccess: jest.fn(), isBlocked: jest.fn().mockReturnValue(false) } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Role), useValue: roleRepo },
        { provide: getRepositoryToken(EmailVerificationToken), useValue: emailTokenRepo },
        { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetRepo },
        { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepo },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('token-mock') } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('15m') } },
        { provide: IpBlockService, useValue: ipBlockService },
        { provide: SecurityLogService, useValue: securityLogService },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register()', () => {
    const registerDto = () => ({
      matricola: 'MAT001',
      email: 'nuovo@test.it',
      password: 'Password1!',
    });

    beforeEach(() => {
      userRepo.findOne.mockResolvedValue(null); // nessun utente esistente
      roleRepo.findOne.mockResolvedValue(userRole());
      userRepo.create.mockReturnValue({ id: 'new-user', ...registerDto() } as unknown as User);
      userRepo.save.mockResolvedValue({ id: 'new-user', email: registerDto().email } as User);
      emailTokenRepo.findOne.mockResolvedValue(null);
      emailTokenRepo.create = jest.fn().mockReturnValue({ token: 'tok-123', expiresAt: new Date() });
      emailTokenRepo.save = jest.fn().mockResolvedValue({ token: 'tok-123' });
    });

    it('registra un nuovo utente e restituisce il messaggio di conferma', async () => {
      const result = await service.register(registerDto());
      expect(result.message).toContain('Registrazione completata');
    });

    it('invia l\'email di verifica', async () => {
      await service.register(registerDto());
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('lancia ConflictException se email già registrata', async () => {
      userRepo.findOne.mockResolvedValueOnce(verifiedUser()); // prima chiamata: email trovata
      await expect(service.register(registerDto())).rejects.toThrow(ConflictException);
    });

    it('lancia ConflictException se matricola già registrata', async () => {
      userRepo.findOne
        .mockResolvedValueOnce(null)           // email non trovata
        .mockResolvedValueOnce(verifiedUser()); // matricola trovata
      await expect(service.register(registerDto())).rejects.toThrow(ConflictException);
    });

    it('lancia BadRequestException se il ruolo USER non esiste', async () => {
      roleRepo.findOne.mockResolvedValue(null);
      await expect(service.register(registerDto())).rejects.toThrow(BadRequestException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login()', () => {
    const loginDto = () => ({ username: 'user@test.it', password: 'Password1!' });

    beforeEach(() => {
      refreshTokenRepo.create = jest.fn().mockReturnValue({});
      refreshTokenRepo.save = jest.fn().mockResolvedValue({});
    });

    it('restituisce access e refresh token per credenziali valide', async () => {
      (userRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(verifiedUser());
      const result = await service.login(loginDto());
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('include i dati utente nella risposta', async () => {
      (userRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(verifiedUser());
      const result = await service.login(loginDto());
      expect(result.user).toMatchObject({ email: 'user@test.it' });
    });

    it('lancia UnauthorizedException se utente non trovato', async () => {
      (userRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(null);
      await expect(service.login(loginDto())).rejects.toThrow(UnauthorizedException);
    });

    it('lancia UnauthorizedException se password errata', async () => {
      (userRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(verifiedUser());
      await expect(service.login({ ...loginDto(), password: 'WrongPass1!' })).rejects.toThrow(UnauthorizedException);
    });

    it('lancia UnauthorizedException se email non verificata', async () => {
      (userRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(verifiedUser({ isVerified: false }));
      await expect(service.login(loginDto())).rejects.toThrow(UnauthorizedException);
    });

    it('lancia UnauthorizedException se utente bloccato', async () => {
      (userRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(verifiedUser({ isBlocked: true }));
      await expect(service.login(loginDto())).rejects.toThrow(UnauthorizedException);
    });

    it('registra un tentativo fallito nel servizio di sicurezza', async () => {
      (userRepo.createQueryBuilder().getOne as jest.Mock).mockResolvedValue(null);
      await expect(service.login(loginDto())).rejects.toThrow();
      expect(securityLogService.log).toHaveBeenCalled();
    });
  });
});
