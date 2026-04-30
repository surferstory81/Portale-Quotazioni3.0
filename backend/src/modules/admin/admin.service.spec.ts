import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Quotation, QuotationStatus } from '../../entities/quotation.entity';
import { User } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { RefreshToken } from '../../entities/refresh-token.entity';
import { AppSetting } from '../../entities/app-setting.entity';
import { EmailVerificationToken } from '../../entities/email-verification-token.entity';
import { EmailService } from '../email/email.service';

// ── helpers ───────────────────────────────────────────────────────────────────

const adminRole  = (): Role => ({ id: 2, name: 'ADMIN', description: '', createdAt: new Date(), users: [] });
const userRole   = (): Role => ({ id: 1, name: 'USER',  description: '', createdAt: new Date(), users: [] });

const mockUser = (override: Partial<User> = {}): User => ({
  id: 'user-1', matricola: 'MAT001', email: 'user@test.it',
  passwordHash: 'hash', isVerified: true, isBlocked: false,
  blockedAt: null, authProvider: 'local', role: userRole(),
  createdAt: new Date(), quotations: [], assignedQuotations: [],
  ...override,
} as User);

const mockAdmin = (override: Partial<User> = {}): User =>
  mockUser({ id: 'admin-1', email: 'admin@test.it', role: adminRole(), ...override });

const mockQuotation = (override: Partial<Quotation> = {}): Quotation => ({
  id: 'quot-1', projectCode: 'PRJ1234567', projectName: 'Test',
  title: 'Test', description: '', status: QuotationStatus.INVIATA,
  totalAmount: 0, formData: {}, createdBy: mockUser(),
  assignedAdmin: null, takenInChargeAt: null,
  createdAt: new Date(), updatedAt: new Date(), details: [],
  ...override,
} as Quotation);

const mockRepo = () => ({
  find: jest.fn(), findOne: jest.fn(), save: jest.fn(),
  count: jest.fn(), remove: jest.fn(), upsert: jest.fn(),
  update: jest.fn(), delete: jest.fn(),
});

// ── suite ─────────────────────────────────────────────────────────────────────

describe('AdminService', () => {
  let service: AdminService;
  let quotationRepo: ReturnType<typeof mockRepo>;
  let userRepo: ReturnType<typeof mockRepo>;
  let settingRepo: ReturnType<typeof mockRepo>;
  let emailService: { sendQuotationStatusChangedEmail: jest.Mock; sendQuotationCompletedEmail: jest.Mock; setEnabled: jest.Mock };

  beforeEach(async () => {
    quotationRepo = mockRepo();
    userRepo      = mockRepo();
    settingRepo   = mockRepo();
    emailService  = {
      sendQuotationStatusChangedEmail: jest.fn().mockResolvedValue(undefined),
      sendQuotationCompletedEmail:     jest.fn().mockResolvedValue(undefined),
      setEnabled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(Quotation),             useValue: quotationRepo },
        { provide: getRepositoryToken(User),                  useValue: userRepo },
        { provide: getRepositoryToken(Role),                  useValue: mockRepo() },
        { provide: getRepositoryToken(RefreshToken),          useValue: mockRepo() },
        { provide: getRepositoryToken(AppSetting),            useValue: settingRepo },
        { provide: getRepositoryToken(EmailVerificationToken), useValue: mockRepo() },
        { provide: EmailService, useValue: emailService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  // ── findAllQuotations ─────────────────────────────────────────────────────

  describe('findAllQuotations()', () => {
    it('restituisce tutte le quotazioni ordinate per data', async () => {
      const quotations = [mockQuotation(), mockQuotation({ id: 'quot-2' })];
      quotationRepo.find.mockResolvedValue(quotations);
      const result = await service.findAllQuotations();
      expect(result).toBe(quotations);
      expect(quotationRepo.find).toHaveBeenCalledWith(expect.objectContaining({ order: { createdAt: 'DESC' } }));
    });
  });

  // ── takeInCharge ──────────────────────────────────────────────────────────

  describe('takeInCharge()', () => {
    it('porta la quotazione in stato IN_VALUTAZIONE', async () => {
      const q = mockQuotation({ status: QuotationStatus.INVIATA });
      quotationRepo.findOne.mockResolvedValue(q);
      quotationRepo.save.mockResolvedValue({ ...q, status: QuotationStatus.IN_VALUTAZIONE });

      const result = await service.takeInCharge('quot-1', mockAdmin());
      expect(result.status).toBe(QuotationStatus.IN_VALUTAZIONE);
    });

    it('assegna l\'admin alla quotazione', async () => {
      const admin = mockAdmin();
      const q = mockQuotation();
      quotationRepo.findOne.mockResolvedValue(q);
      quotationRepo.save.mockImplementation(async (saved) => saved);

      await service.takeInCharge('quot-1', admin);
      expect(q.assignedAdmin).toBe(admin);
    });

    it('invia email di notifica', async () => {
      const q = mockQuotation();
      quotationRepo.findOne.mockResolvedValue(q);
      quotationRepo.save.mockImplementation(async (s) => s);
      await service.takeInCharge('quot-1', mockAdmin());
      expect(emailService.sendQuotationStatusChangedEmail).toHaveBeenCalled();
    });

    it('lancia BadRequestException se la quotazione non è INVIATA', async () => {
      const q = mockQuotation({ status: QuotationStatus.IN_VALUTAZIONE });
      quotationRepo.findOne.mockResolvedValue(q);
      await expect(service.takeInCharge('quot-1', mockAdmin())).rejects.toThrow(BadRequestException);
    });

    it('lancia NotFoundException se la quotazione non esiste', async () => {
      quotationRepo.findOne.mockResolvedValue(null);
      await expect(service.takeInCharge('non-esiste', mockAdmin())).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateQuotationStatus ─────────────────────────────────────────────────

  describe('updateQuotationStatus()', () => {
    it('permette transizione IN_VALUTAZIONE → RESPINTA', async () => {
      const q = mockQuotation({ status: QuotationStatus.IN_VALUTAZIONE });
      quotationRepo.findOne.mockResolvedValue(q);
      quotationRepo.save.mockImplementation(async (s) => s);
      const result = await service.updateQuotationStatus('quot-1', 'RESPINTA');
      expect(result.status).toBe(QuotationStatus.RESPINTA);
    });

    it('permette transizione IN_VALUTAZIONE → COMPLETATA con totalAmount > 0', async () => {
      const q = mockQuotation({ status: QuotationStatus.IN_VALUTAZIONE, totalAmount: 5000 });
      quotationRepo.findOne.mockResolvedValue(q);
      quotationRepo.save.mockImplementation(async (s) => s);
      await expect(service.updateQuotationStatus('quot-1', 'COMPLETATA')).resolves.toBeDefined();
    });

    it('invia email completamento quando quota → COMPLETATA', async () => {
      const q = mockQuotation({ status: QuotationStatus.IN_VALUTAZIONE, totalAmount: 5000 });
      quotationRepo.findOne.mockResolvedValue(q);
      quotationRepo.save.mockImplementation(async (s) => s);
      await service.updateQuotationStatus('quot-1', 'COMPLETATA');
      expect(emailService.sendQuotationCompletedEmail).toHaveBeenCalled();
    });

    it('lancia BadRequestException per transizione INVIATA → COMPLETATA', async () => {
      const q = mockQuotation({ status: QuotationStatus.INVIATA });
      quotationRepo.findOne.mockResolvedValue(q);
      await expect(service.updateQuotationStatus('quot-1', 'COMPLETATA')).rejects.toThrow(BadRequestException);
    });

    it('lancia BadRequestException se COMPLETATA senza totalAmount', async () => {
      const q = mockQuotation({ status: QuotationStatus.IN_VALUTAZIONE, totalAmount: 0 });
      quotationRepo.findOne.mockResolvedValue(q);
      await expect(service.updateQuotationStatus('quot-1', 'COMPLETATA')).rejects.toThrow(BadRequestException);
    });
  });

  // ── setEconomicQuotation ──────────────────────────────────────────────────

  describe('setEconomicQuotation()', () => {
    it('imposta il totalAmount correttamente', async () => {
      const q = mockQuotation({ status: QuotationStatus.IN_VALUTAZIONE });
      quotationRepo.findOne.mockResolvedValue(q);
      quotationRepo.save.mockImplementation(async (s) => s);
      const result = await service.setEconomicQuotation('quot-1', 12500);
      expect(result.totalAmount).toBe(12500);
    });

    it('lancia BadRequestException se lo stato non è IN_VALUTAZIONE', async () => {
      const q = mockQuotation({ status: QuotationStatus.INVIATA });
      quotationRepo.findOne.mockResolvedValue(q);
      await expect(service.setEconomicQuotation('quot-1', 1000)).rejects.toThrow(BadRequestException);
    });
  });

  // ── blockUser ─────────────────────────────────────────────────────────────

  describe('blockUser()', () => {
    it('blocca un utente attivo', async () => {
      const user = mockUser({ isBlocked: false });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockImplementation(async (u) => u);
      const result = await service.blockUser('user-1', true);
      expect(result.isBlocked).toBe(true);
    });

    it('sblocca un utente bloccato', async () => {
      const user = mockUser({ isBlocked: true, blockedAt: new Date() });
      userRepo.findOne.mockResolvedValue(user);
      userRepo.save.mockImplementation(async (u) => u);
      const result = await service.blockUser('user-1', false);
      expect(result.isBlocked).toBe(false);
    });

    it('lancia NotFoundException se utente non trovato', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.blockUser('non-esiste', true)).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteUser ────────────────────────────────────────────────────────────

  describe('deleteUser()', () => {
    it('elimina un utente senza quotazioni', async () => {
      const user = mockUser({ role: userRole() });
      userRepo.findOne.mockResolvedValue(user);
      quotationRepo.count.mockResolvedValue(0);
      userRepo.count.mockResolvedValue(2);
      userRepo.remove.mockResolvedValue(user);
      const result = await service.deleteUser('user-1', 'admin-1');
      expect(result.message).toContain(user.email);
    });

    it('lancia BadRequestException se l\'admin elimina se stesso', async () => {
      await expect(service.deleteUser('admin-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('lancia BadRequestException se l\'utente ha quotazioni', async () => {
      userRepo.findOne.mockResolvedValue(mockUser());
      quotationRepo.count.mockResolvedValue(3);
      await expect(service.deleteUser('user-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('lancia BadRequestException se si tenta di eliminare l\'unico admin', async () => {
      const admin = mockAdmin();
      userRepo.findOne.mockResolvedValue(admin);
      quotationRepo.count.mockResolvedValue(0);
      userRepo.count.mockResolvedValue(1);
      await expect(service.deleteUser('admin-1', 'altro-admin')).rejects.toThrow(BadRequestException);
    });
  });

  // ── setSystemSetting ──────────────────────────────────────────────────────

  describe('setSystemSetting()', () => {
    it('aggiorna email_enabled', async () => {
      settingRepo.upsert.mockResolvedValue({});
      settingRepo.find.mockResolvedValue([
        { key: 'email_enabled', value: 'true' },
        { key: 'sso_enabled',   value: 'false' },
      ]);
      const result = await service.setSystemSetting('email_enabled', true);
      expect(result.email_enabled).toBe(true);
      expect(emailService.setEnabled).toHaveBeenCalledWith(true);
    });

    it('lancia BadRequestException per chiave non valida', async () => {
      await expect(service.setSystemSetting('chiave_inventata', true)).rejects.toThrow(BadRequestException);
    });
  });
});
