import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AIEstimation,
  AIStatus,
  EstimationData,
  ValidationData,
} from '../../entities/ai-estimation.entity';
import { Quotation } from '../../entities/quotation.entity';
import { User } from '../../entities/user.entity';
import { AiServiceClientService } from './ai-service-client.service';

@Injectable()
export class AIEstimationService {
  private readonly logger = new Logger(AIEstimationService.name);

  constructor(
    @InjectRepository(AIEstimation)
    private readonly aiEstimationRepo: Repository<AIEstimation>,
    @InjectRepository(Quotation)
    private readonly quotationRepo: Repository<Quotation>,
    private readonly aiServiceClient: AiServiceClientService,
  ) {}

  /**
   * Export estimation as PDF (proxied to AI service)
   */
  async exportPDF(quotationId: string): Promise<Buffer> {
    return this.aiServiceClient.exportPDF(quotationId);
  }

  /**
   * Export estimation as Excel (proxied to AI service)
   */
  async exportExcel(quotationId: string): Promise<Buffer> {
    return this.aiServiceClient.exportExcel(quotationId);
  }

  /**
   * Generate estimation for a quotation using the Estimation Agent.
   * This method should be called by the AI agent orchestration layer.
   */
  async generateEstimation(
    quotationId: string,
    estimationData: EstimationData,
  ): Promise<AIEstimation> {
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId },
    });

    if (!quotation) {
      throw new NotFoundException('Quotazione non trovata');
    }

    // Check if estimation already exists
    const existingEstimation = await this.aiEstimationRepo.findOne({
      where: { quotationId },
      order: { createdAt: 'DESC' },
    });

    if (existingEstimation) {
      throw new BadRequestException(
        'Una stima AI esiste già per questa quotazione. Usa validateEstimation per procedere.',
      );
    }

    const estimation = this.aiEstimationRepo.create({
      quotationId,
      estimationData,
      aiStatus: AIStatus.AI_GENERATED,
      generatedBy: 'ai-estimation-service',
      generatedAt: new Date(),
      confidence: estimationData.confidence_score || 0,
    });

    return this.aiEstimationRepo.save(estimation);
  }

  /**
   * Validate an existing estimation using the Validation Agent.
   */
  async validateEstimation(
    estimationId: string,
    validationData: ValidationData,
  ): Promise<AIEstimation> {
    const estimation = await this.aiEstimationRepo.findOne({
      where: { id: estimationId },
    });

    if (!estimation) {
      throw new NotFoundException('Stima AI non trovata');
    }

    if (estimation.aiStatus !== AIStatus.AI_GENERATED) {
      throw new BadRequestException(
        'La validazione è possibile solo per stime in stato AI_GENERATED',
      );
    }

    // Determine new status based on validation decision
    let newStatus: AIStatus;
    switch (validationData.decision) {
      case 'APPROVE':
        newStatus =
          validationData.confidence > 85
            ? AIStatus.AI_VALIDATED
            : AIStatus.AI_NEEDS_REVIEW;
        break;
      case 'REVIEW':
      case 'SENIOR_REVIEW':
        newStatus = AIStatus.AI_NEEDS_REVIEW;
        break;
      case 'REJECT':
        newStatus = AIStatus.AI_REJECTED;
        break;
      default:
        newStatus = AIStatus.AI_NEEDS_REVIEW;
    }

    estimation.validationData = validationData;
    estimation.aiStatus = newStatus;
    estimation.validatedBy = 'ai-validation-service';
    estimation.validatedAt = new Date();
    estimation.confidence = validationData.confidence || estimation.confidence;

    return this.aiEstimationRepo.save(estimation);
  }

  /**
   * Retrieve estimation for a quotation.
   */
  async getEstimationByQuotationId(
    quotationId: string,
  ): Promise<AIEstimation | null> {
    return this.aiEstimationRepo.findOne({
      where: { quotationId },
      order: { createdAt: 'DESC' },
      relations: ['quotation', 'humanReviewer'],
    });
  }

  /**
   * Human admin approves an AI estimation.
   */
  async approveEstimation(
    estimationId: string,
    adminId: string,
    adminNotes?: string,
  ): Promise<AIEstimation> {
    const estimation = await this.aiEstimationRepo.findOne({
      where: { id: estimationId },
      relations: ['quotation'],
    });

    if (!estimation) {
      throw new NotFoundException('Stima AI non trovata');
    }

    if (
      estimation.aiStatus !== AIStatus.AI_VALIDATED &&
      estimation.aiStatus !== AIStatus.AI_NEEDS_REVIEW
    ) {
      throw new BadRequestException(
        'Approvazione possibile solo per stime validate o in revisione',
      );
    }

    // Update quotation total amount from estimation
    if (estimation.quotation) {
      estimation.quotation.totalAmount =
        estimation.estimationData.summary.total_first_year;
      await this.quotationRepo.save(estimation.quotation);
    }

    estimation.aiStatus = AIStatus.HUMAN_APPROVED;
    estimation.humanReviewerId = adminId;
    estimation.humanReviewedAt = new Date();
    estimation.adminNotes = adminNotes || null;

    return this.aiEstimationRepo.save(estimation);
  }

  /**
   * Human admin rejects an AI estimation.
   */
  async rejectEstimation(
    estimationId: string,
    adminId: string,
    adminNotes: string,
  ): Promise<AIEstimation> {
    const estimation = await this.aiEstimationRepo.findOne({
      where: { id: estimationId },
    });

    if (!estimation) {
      throw new NotFoundException('Stima AI non trovata');
    }

    estimation.aiStatus = AIStatus.HUMAN_REJECTED;
    estimation.humanReviewerId = adminId;
    estimation.humanReviewedAt = new Date();
    estimation.adminNotes = adminNotes;

    return this.aiEstimationRepo.save(estimation);
  }

  /**
   * List all estimations requiring human review.
   */
  async findEstimationsNeedingReview(): Promise<AIEstimation[]> {
    return this.aiEstimationRepo.find({
      where: [
        { aiStatus: AIStatus.AI_NEEDS_REVIEW },
        { aiStatus: AIStatus.AI_VALIDATED },
      ],
      relations: ['quotation', 'quotation.createdBy'],
      order: { generatedAt: 'DESC' },
    });
  }

  /**
   * Get estimation statistics.
   */
  async getStatistics(): Promise<{
    total: number;
    byStatus: Record<AIStatus, number>;
    averageConfidence: number;
  }> {
    const all = await this.aiEstimationRepo.find();

    const byStatus = all.reduce(
      (acc, est) => {
        acc[est.aiStatus] = (acc[est.aiStatus] || 0) + 1;
        return acc;
      },
      {} as Record<AIStatus, number>,
    );

    const confidenceSum = all.reduce(
      (sum, est) => sum + (est.confidence || 0),
      0,
    );
    const averageConfidence = all.length > 0 ? confidenceSum / all.length : 0;

    return {
      total: all.length,
      byStatus,
      averageConfidence: Math.round(averageConfidence),
    };
  }

  /**
   * Retry AI estimation for an existing quotation.
   * Re-publishes the quotation.created event to trigger AI processing.
   * Useful for quotations created before AI service was deployed.
   */
  async retryEstimation(
    quotationId: string,
    adminId: string,
  ): Promise<{ message: string; quotationId: string }> {
    // Verify quotation exists
    const quotation = await this.quotationRepo.findOne({
      where: { id: quotationId },
      relations: ['createdBy'],
    });

    if (!quotation) {
      throw new NotFoundException('Quotazione non trovata');
    }

    // Check if estimation already exists
    const existingEstimation = await this.aiEstimationRepo.findOne({
      where: { quotationId },
      order: { createdAt: 'DESC' },
    });

    if (existingEstimation) {
      // Allow retry only if previous estimation failed or needs review
      if (
        existingEstimation.aiStatus !== AIStatus.AI_REJECTED &&
        existingEstimation.aiStatus !== AIStatus.AI_NEEDS_REVIEW
      ) {
        throw new BadRequestException(
          `Stima AI già presente con stato ${existingEstimation.aiStatus}. Usa gli endpoint approve/reject per gestirla.`,
        );
      }
      this.logger.log(
        `Retrying estimation for quotation ${quotationId}, previous status: ${existingEstimation.aiStatus}`,
      );
    }

    // Call AI service via HTTP (synchronous for manual retry)
    try {
      const result = await this.aiServiceClient.requestQuotationProcessingSync({
        quotation_id: quotation.id,
        user_id: quotation.createdBy?.id || 'system',
        project_code: quotation.projectCode,
        status: quotation.status,
      });

      this.logger.log(
        `AI estimation retry completed by admin ${adminId} for quotation ${quotationId}`,
      );

      return {
        message:
          'Stima AI generata e validata con successo.',
        quotationId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to request AI processing for quotation ${quotationId}: ${error.message}`,
      );
      throw new BadRequestException(
        'Impossibile contattare l\'AI service. Verifica che il servizio sia attivo.',
      );
    }
  }
}
