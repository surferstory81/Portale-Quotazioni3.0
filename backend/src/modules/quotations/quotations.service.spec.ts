import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { QuotationsService } from './quotations.service';
import { Quotation, QuotationStatus } from '../../entities/quotation.entity';
import { User } from '../../entities/user.entity';
import { EmailService } from '../email/email.service';
import { CreateQuotationDto } from './dto/quotations.dto';

// ── helpers ──────────────────────────────────────────────────────────────────

const mockUser = (override: Partial<User> = {}): User =>
  ({ id: 'user-1', email: 'user@test.it', matricola: 'MAT001', ...override } as User);

const mockQuotation = (override: Partial<Quotation> = {}): Quotation =>
  ({
    id: 'quot-1',
    projectCode: 'PRJ1234567',
    projectName: 'Test Project',
    title: 'Test Project',
    description: 'Quotazione progetto PRJ1234567',
    status: QuotationStatus.INVIATA,
    totalAmount: 0,
    formData: {},
    createdBy: mockUser(),
    assignedAdmin: null,
    takenInChargeAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    details: [],
    ...override,
  } as Quotation);

const baseDto = (): CreateQuotationDto => ({
  projectCode: 'PRJ1234567',
  projectName: 'Test Project',
  projectStartDate: '2026-01-01',
  projectEndDate: '2026-12-31',
  projectDuration: '> 1 anno',
  projectBudget: '1.000 – 5.000',
  architecturalImpact: 'SI',
  cloudSaas: false,
  cloudIaasPaasLandingZoneCa: true,
  hostMainframe: false,
  onPremiseDipartimentale: false,
  needNewInfrastructure: true,
  infraOnVm: false,
  infraMicroservices: true,
  impactEntity: 'Moderato',
  serviceConsumer: 'Utenti Direzione Centrale',
  serviceVolumesPerDay: 1000,
  technologicalImpact: 'Evoluzione tecnologica',
  developedInternally: true,
  developedByExternalVendors: false,
  hasCaIntellectualProperty: true,
  serviceExposure: false,
  marketProduct: false,
  dependenciesWithExternalServices: true,
  integrationsWithInternalSystems: true,
  saasProduct: false,
  monitoringOrSecurityTool: false,
  expectedReleases: 4,
  projectType: 'Nuovo',
  serviceRisk: 'Moderato',
  pipeline: '10-30',
  microservicesCount: 5,
  hasDatabaseImpactDip: true,
  hasSqlDbType: true,
  hasDatabaseImpactHostDb2: false,
  storageGb: 500,
  computeCores: 8,
  scheduledBatches: 2,
  monitoringSystems: 'SI',
  observability: 'SI',
  testMagnitude: '100–1.000',
  qa: 'SI',
} as CreateQuotationDto);

// ── mock factories ────────────────────────────────────────────────────────────

const mockRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  }),
});

const mockEmailService = () => ({
  sendNewQuotationEmail: jest.fn().mockResolvedValue(undefined),
});

// ── suite ─────────────────────────────────────────────────────────────────────

describe('QuotationsService', () => {
  let service: QuotationsService;
  let repo: jest.Mocked<Repository<Quotation>>;
  let emailService: jest.Mocked<EmailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: getRepositoryToken(Quotation), useFactory: mockRepo },
        { provide: EmailService, useFactory: mockEmailService },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
    repo = module.get(getRepositoryToken(Quotation));
    emailService = module.get(EmailService);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('crea e salva una quotazione con stato INVIATA', async () => {
      const user = mockUser();
      const dto = baseDto();
      const saved = mockQuotation();

      (repo.create as jest.Mock).mockReturnValue(saved);
      (repo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.create(user, dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectCode: dto.projectCode, status: QuotationStatus.INVIATA }),
      );
      expect(repo.save).toHaveBeenCalledWith(saved);
      expect(result).toBe(saved);
    });

    it('invia email dopo la creazione', async () => {
      const user = mockUser();
      const saved = mockQuotation();
      (repo.create as jest.Mock).mockReturnValue(saved);
      (repo.save as jest.Mock).mockResolvedValue(saved);

      await service.create(user, baseDto());

      expect(emailService.sendNewQuotationEmail).toHaveBeenCalledWith(saved, user);
    });

    it('lancia BadRequestException se endDate < startDate', async () => {
      const dto = { ...baseDto(), projectStartDate: '2026-12-31', projectEndDate: '2026-01-01' };
      await expect(service.create(mockUser(), dto)).rejects.toThrow(BadRequestException);
    });

    it('accetta startDate === endDate (stesso giorno)', async () => {
      const dto = { ...baseDto(), projectStartDate: '2026-06-01', projectEndDate: '2026-06-01' };
      const saved = mockQuotation();
      (repo.create as jest.Mock).mockReturnValue(saved);
      (repo.save as jest.Mock).mockResolvedValue(saved);

      await expect(service.create(mockUser(), dto)).resolves.toBe(saved);
    });
  });

  // ── findUserQuotations ────────────────────────────────────────────────────

  describe('findUserQuotations()', () => {
    it('restituisce le quotazioni dell\'utente corrente', async () => {
      const quotations = [mockQuotation(), mockQuotation({ id: 'quot-2' })];
      const qb = repo.createQueryBuilder('quotation');
      (qb.getMany as jest.Mock).mockResolvedValue(quotations);

      const result = await service.findUserQuotations('user-1', {});

      expect(result).toBe(quotations);
    });

    it('applica filtro projectCode se fornito', async () => {
      const qb = repo.createQueryBuilder('quotation');
      (qb.getMany as jest.Mock).mockResolvedValue([]);

      await service.findUserQuotations('user-1', { projectCode: 'PRJ' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('projectCode'),
        expect.objectContaining({ projectCode: '%PRJ%' }),
      );
    });

    it('applica filtro projectName se fornito', async () => {
      const qb = repo.createQueryBuilder('quotation');
      (qb.getMany as jest.Mock).mockResolvedValue([]);

      await service.findUserQuotations('user-1', { projectName: 'Test' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('projectName'),
        expect.objectContaining({ projectName: '%Test%' }),
      );
    });

    it('non applica filtri se i valori sono undefined', async () => {
      const qb = repo.createQueryBuilder('quotation');
      (qb.getMany as jest.Mock).mockResolvedValue([]);

      await service.findUserQuotations('user-1', {});

      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  // ── findCompletedByUser ───────────────────────────────────────────────────

  describe('findCompletedByUser()', () => {
    it('restituisce solo le quotazioni COMPLETATA', async () => {
      const completed = [mockQuotation({ status: QuotationStatus.COMPLETATA })];
      const qb = repo.createQueryBuilder('quotation');
      (qb.getMany as jest.Mock).mockResolvedValue(completed);

      const result = await service.findCompletedByUser('user-1');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('status'),
        expect.objectContaining({ status: QuotationStatus.COMPLETATA }),
      );
      expect(result).toBe(completed);
    });
  });

  // ── updateRejected ────────────────────────────────────────────────────────

  describe('updateRejected()', () => {
    it('aggiorna una quotazione RESPINTA e la rimette in INVIATA', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.RESPINTA });
      (repo.findOne as jest.Mock).mockResolvedValue(quotation);
      (repo.save as jest.Mock).mockResolvedValue({ ...quotation, status: QuotationStatus.INVIATA });

      const result = await service.updateRejected('quot-1', 'user-1', baseDto());

      expect(result.status).toBe(QuotationStatus.INVIATA);
      expect(repo.save).toHaveBeenCalled();
    });

    it('lancia NotFoundException se la quotazione non esiste', async () => {
      (repo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.updateRejected('non-esiste', 'user-1', baseDto())).rejects.toThrow(NotFoundException);
    });

    it('lancia ForbiddenException se l\'utente non è il proprietario', async () => {
      const quotation = mockQuotation({ createdBy: mockUser({ id: 'altro-user' }), status: QuotationStatus.RESPINTA });
      (repo.findOne as jest.Mock).mockResolvedValue(quotation);
      await expect(service.updateRejected('quot-1', 'user-1', baseDto())).rejects.toThrow(ForbiddenException);
    });

    it('lancia BadRequestException se lo stato non è RESPINTA', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.IN_VALUTAZIONE });
      (repo.findOne as jest.Mock).mockResolvedValue(quotation);
      await expect(service.updateRejected('quot-1', 'user-1', baseDto())).rejects.toThrow(BadRequestException);
    });

    it('lancia BadRequestException se endDate < startDate in aggiornamento', async () => {
      const quotation = mockQuotation({ status: QuotationStatus.RESPINTA });
      (repo.findOne as jest.Mock).mockResolvedValue(quotation);
      const dto = { ...baseDto(), projectStartDate: '2026-12-31', projectEndDate: '2026-01-01' };
      await expect(service.updateRejected('quot-1', 'user-1', dto)).rejects.toThrow(BadRequestException);
    });
  });
});
