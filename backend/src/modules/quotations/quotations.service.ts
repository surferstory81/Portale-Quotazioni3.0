import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Quotation,
  QuotationStatus,
} from '../../entities/quotation.entity';
import { User } from '../../entities/user.entity';
import {
  CreateQuotationDto,
  ListQuotationsQueryDto,
  UpdateQuotationDto,
  SaveDraftDto,
} from './dto/quotations.dto';
import { EmailService } from '../email/email.service';
import { AiServiceClientService } from '../ai-estimation/ai-service-client.service';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    private readonly emailService: EmailService,
    private readonly aiServiceClient: AiServiceClientService,
  ) {}

  async create(user: User, dto: CreateQuotationDto): Promise<Quotation> {
    const startDate = new Date(dto.projectStartDate);
    const endDate = new Date(dto.projectEndDate);

    if (endDate < startDate) {
      throw new BadRequestException(
        'La data fine progetto deve essere successiva o uguale alla data inizio progetto.',
      );
    }

    const quotation = this.quotationRepo.create({
      projectCode: dto.projectCode,
      projectName: dto.projectName,
      title: dto.projectName,
      description: `Quotazione progetto ${dto.projectCode}`,
      status: QuotationStatus.INVIATA,
      totalAmount: 0,
      formData: this.buildFormData(dto),
      createdBy: user,
    });

    const savedQuotation = await this.quotationRepo.save(quotation);

    // Send email asynchronously (fire-and-forget) to avoid blocking the response
    this.emailService.sendNewQuotationEmail(savedQuotation, user).catch((error) => {
      // Log error but don't fail the request
      console.error('Failed to send new quotation email:', error);
    });

    // AI estimation will be triggered when admin takes the quotation in charge

    return savedQuotation;
  }

  async saveDraft(user: User, dto: SaveDraftDto): Promise<Quotation> {
    // Validazione opzionale per le date se presenti entrambe
    if (dto.projectStartDate && dto.projectEndDate) {
      const startDate = new Date(dto.projectStartDate);
      const endDate = new Date(dto.projectEndDate);

      if (endDate < startDate) {
        throw new BadRequestException(
          'La data fine progetto deve essere successiva o uguale alla data inizio progetto.',
        );
      }
    }

    const quotation = this.quotationRepo.create({
      projectCode: dto.projectCode || `DRAFT-${Date.now()}`,
      projectName: dto.projectName || 'Bozza senza titolo',
      title: dto.projectName || 'Bozza senza titolo',
      description: dto.projectCode
        ? `Bozza quotazione progetto ${dto.projectCode}`
        : 'Bozza di quotazione',
      status: QuotationStatus.BOZZA,
      totalAmount: 0,
      formData: this.buildFormData(dto as any),
      createdBy: user,
    });

    return this.quotationRepo.save(quotation);
  }

  async updateDraft(
    id: string,
    userId: string,
    dto: SaveDraftDto,
  ): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!quotation) {
      throw new NotFoundException('Bozza non trovata');
    }

    if (quotation.createdBy?.id !== userId) {
      throw new ForbiddenException(
        'Non sei autorizzato a modificare questa bozza',
      );
    }

    if (quotation.status !== QuotationStatus.BOZZA) {
      throw new BadRequestException(
        'La modifica e consentita solo per le bozze',
      );
    }

    // Validazione opzionale per le date se presenti entrambe
    if (dto.projectStartDate && dto.projectEndDate) {
      const startDate = new Date(dto.projectStartDate);
      const endDate = new Date(dto.projectEndDate);

      if (endDate < startDate) {
        throw new BadRequestException(
          'La data fine progetto deve essere successiva o uguale alla data inizio progetto.',
        );
      }
    }

    // Aggiorna solo i campi forniti
    if (dto.projectCode) quotation.projectCode = dto.projectCode;
    if (dto.projectName) {
      quotation.projectName = dto.projectName;
      quotation.title = dto.projectName;
    }

    quotation.description = dto.projectCode
      ? `Bozza quotazione progetto ${dto.projectCode}`
      : 'Bozza di quotazione';

    quotation.formData = this.buildFormData(dto as any);

    return this.quotationRepo.save(quotation);
  }

  async submitDraft(id: string, userId: string): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!quotation) {
      throw new NotFoundException('Bozza non trovata');
    }

    if (quotation.createdBy?.id !== userId) {
      throw new ForbiddenException(
        'Non sei autorizzato a inviare questa bozza',
      );
    }

    if (quotation.status !== QuotationStatus.BOZZA) {
      throw new BadRequestException(
        'Solo le bozze possono essere inviate',
      );
    }

    // Validazione completa prima dell'invio
    const formData = quotation.formData as any;

    const errors: string[] = [];

    if (!quotation.projectCode || quotation.projectCode.startsWith('DRAFT-')) {
      errors.push('Codice progetto');
    }
    if (!quotation.projectName || quotation.projectName === 'Bozza senza titolo') {
      errors.push('Nome progetto');
    }
    if (!formData.projectStartDate) {
      errors.push('Data inizio progetto');
    }
    if (!formData.projectEndDate) {
      errors.push('Data fine progetto');
    }
    if (!formData.projectDuration) {
      errors.push('Durata progetto');
    }
    if (!formData.projectBudget) {
      errors.push('Budget progetto');
    }
    if (!formData.architecturalImpact) {
      errors.push('Impatto architetturale');
    }
    if (!formData.impactEntity) {
      errors.push('Entità impatto');
    }
    if (!formData.serviceConsumer) {
      errors.push('Consumatore servizio');
    }
    if (formData.serviceVolumesPerDay === undefined || formData.serviceVolumesPerDay === null) {
      errors.push('Volumi servizio giornalieri');
    }
    if (!formData.technologicalImpact) {
      errors.push('Impatto tecnologico');
    }
    if (formData.expectedReleases === undefined || formData.expectedReleases === null) {
      errors.push('Release previste');
    }
    if (!formData.projectType) {
      errors.push('Tipo progetto');
    }
    if (!formData.serviceRisk) {
      errors.push('Rischio servizio');
    }
    if (!formData.pipeline) {
      errors.push('Pipeline');
    }
    if (formData.microservicesCount === undefined || formData.microservicesCount === null) {
      errors.push('Numero microservizi');
    }
    if (formData.storageGb === undefined || formData.storageGb === null) {
      errors.push('Storage GB');
    }
    if (formData.computeCores === undefined || formData.computeCores === null) {
      errors.push('Core di calcolo');
    }
    if (formData.scheduledBatches === undefined || formData.scheduledBatches === null) {
      errors.push('Batch schedulati');
    }
    if (!formData.monitoringSystems) {
      errors.push('Sistemi di monitoraggio');
    }
    if (!formData.observability) {
      errors.push('Observability');
    }
    if (!formData.qa) {
      errors.push('QA');
    }

    if (errors.length > 0) {
      throw new BadRequestException(
        `La bozza non puo essere inviata. Campi mancanti: ${errors.join(', ')}`,
      );
    }

    quotation.status = QuotationStatus.INVIATA;
    quotation.description = `Quotazione progetto ${quotation.projectCode}`;

    const savedQuotation = await this.quotationRepo.save(quotation);

    // Send email asynchronously (fire-and-forget) to avoid blocking the response
    this.emailService.sendNewQuotationEmail(
      savedQuotation,
      quotation.createdBy,
    ).catch((error) => {
      // Log error but don't fail the request
      console.error('Failed to send draft submission email:', error);
    });

    return savedQuotation;
  }

  async findDraftsByUser(userId: string): Promise<Quotation[]> {
    return this.quotationRepo
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.createdBy', 'createdBy')
      .where('createdBy.id = :userId', { userId })
      .andWhere('quotation.status = :status', {
        status: QuotationStatus.BOZZA,
      })
      .orderBy('quotation.updatedAt', 'DESC')
      .getMany();
  }

  async deleteDraft(id: string, userId: string): Promise<{ message: string }> {
    const quotation = await this.quotationRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!quotation) {
      throw new NotFoundException('Bozza non trovata');
    }

    if (quotation.createdBy?.id !== userId) {
      throw new ForbiddenException(
        'Non sei autorizzato a eliminare questa bozza',
      );
    }

    if (quotation.status !== QuotationStatus.BOZZA) {
      throw new BadRequestException(
        'Solo le bozze possono essere eliminate',
      );
    }

    await this.quotationRepo.remove(quotation);
    return {
      message: `Bozza "${quotation.projectName}" eliminata con successo`,
    };
  }

  async findUserQuotations(
    userId: string,
    query: ListQuotationsQueryDto,
  ): Promise<Quotation[]> {
    const qb = this.quotationRepo
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.createdBy', 'createdBy')
      .where('createdBy.id = :userId', { userId })
      .andWhere('quotation.status != :draftStatus', { draftStatus: QuotationStatus.BOZZA })
      .orderBy('quotation.createdAt', 'DESC');

    if (query.projectCode) {
      qb.andWhere('quotation.projectCode ILIKE :projectCode', {
        projectCode: `%${query.projectCode}%`,
      });
    }

    if (query.projectName) {
      qb.andWhere('quotation.projectName ILIKE :projectName', {
        projectName: `%${query.projectName}%`,
      });
    }

    return qb.getMany();
  }

  async findCompletedByUser(userId: string): Promise<Quotation[]> {
    return this.quotationRepo
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.createdBy', 'createdBy')
      .where('createdBy.id = :userId', { userId })
      .andWhere('quotation.status = :status', {
        status: QuotationStatus.COMPLETATA,
      })
      .orderBy('quotation.updatedAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!quotation) {
      throw new NotFoundException('Quotazione non trovata');
    }

    return quotation;
  }

  async updateRejected(
    id: string,
    userId: string,
    dto: UpdateQuotationDto,
  ): Promise<Quotation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!quotation) {
      throw new NotFoundException('Quotazione non trovata');
    }

    if (quotation.createdBy?.id !== userId) {
      throw new ForbiddenException(
        'Non sei autorizzato a modificare questa quotazione',
      );
    }

    if (quotation.status !== QuotationStatus.RESPINTA) {
      throw new BadRequestException(
        'La modifica e consentita solo per quotazioni in stato RESPINTA',
      );
    }

    const startDate = new Date(dto.projectStartDate);
    const endDate = new Date(dto.projectEndDate);
    if (endDate < startDate) {
      throw new BadRequestException(
        'La data fine progetto deve essere successiva o uguale alla data inizio progetto.',
      );
    }

    quotation.projectCode = dto.projectCode;
    quotation.projectName = dto.projectName;
    quotation.title = dto.projectName;
    quotation.description = `Quotazione progetto ${dto.projectCode}`;
    quotation.formData = this.buildFormData(dto);
    quotation.status = QuotationStatus.INVIATA;

    return this.quotationRepo.save(quotation);
  }

  private buildFormData(dto: CreateQuotationDto): Record<string, unknown> {
    return {
      projectCode: dto.projectCode,
      projectName: dto.projectName,
      projectStartDate: dto.projectStartDate,
      projectEndDate: dto.projectEndDate,
      projectDuration: dto.projectDuration,
      projectBudget: dto.projectBudget,
      architecturalImpact: dto.architecturalImpact,
      cloudSaas: dto.cloudSaas,
      cloudIaasPaasLandingZoneCa: dto.cloudIaasPaasLandingZoneCa,
      hostMainframe: dto.hostMainframe,
      onPremiseDipartimentale: dto.onPremiseDipartimentale,
      needNewInfrastructure: dto.needNewInfrastructure,
      infraOnVm: dto.infraOnVm,
      infraMicroservices: dto.infraMicroservices,
      impactEntity: dto.impactEntity,
      serviceConsumer: dto.serviceConsumer,
      serviceVolumesPerDay: dto.serviceVolumesPerDay,
      technologicalImpact: dto.technologicalImpact,
      developedInternally: dto.developedInternally,
      developedByExternalVendors: dto.developedByExternalVendors,
      hasCaIntellectualProperty: dto.hasCaIntellectualProperty,
      serviceExposure: dto.serviceExposure,
      marketProduct: dto.marketProduct,
      dependenciesWithExternalServices: dto.dependenciesWithExternalServices,
      integrationsWithInternalSystems: dto.integrationsWithInternalSystems,
      saasProduct: dto.saasProduct,
      monitoringOrSecurityTool: dto.monitoringOrSecurityTool,
      expectedReleases: dto.expectedReleases,
      projectType: dto.projectType,
      serviceRisk: dto.serviceRisk,
      pipeline: dto.pipeline,
      microservicesCount: dto.microservicesCount,
      hasDatabaseImpactDip: dto.hasDatabaseImpactDip,
      hasSqlDbType: dto.hasSqlDbType,
      hasDatabaseImpactHostDb2: dto.hasDatabaseImpactHostDb2,
      storageGb: dto.storageGb,
      computeCores: dto.computeCores,
      scheduledBatches: dto.scheduledBatches,
      monitoringSystems: dto.monitoringSystems,
      observability: dto.observability,
      qa: dto.qa,
      isThirdPartyApp: dto.isThirdPartyApp,
      isAppliance: dto.isAppliance,
      hasExistingPipelines: dto.hasExistingPipelines,
      requiresFeasibilityStudy: dto.requiresFeasibilityStudy,
      requiresRfcSupport: dto.requiresRfcSupport,
    };
  }
}
