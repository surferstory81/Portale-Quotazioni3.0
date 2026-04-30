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
} from './dto/quotations.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class QuotationsService {
  constructor(
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    private readonly emailService: EmailService,
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

    await this.emailService.sendNewQuotationEmail(savedQuotation, user);

    return savedQuotation;
  }

  async findUserQuotations(
    userId: string,
    query: ListQuotationsQueryDto,
  ): Promise<Quotation[]> {
    const qb = this.quotationRepo
      .createQueryBuilder('quotation')
      .leftJoinAndSelect('quotation.createdBy', 'createdBy')
      .where('createdBy.id = :userId', { userId })
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
      testMagnitude: dto.testMagnitude,
      qa: dto.qa,
    };
  }
}
