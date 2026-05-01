import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EstimationData, ValidationData } from '../../entities/ai-estimation.entity';

export interface QuotationProcessRequest {
  quotation_id: string;
  user_id: string;
  project_code: string;
  status: string;
}

@Injectable()
export class AiServiceClientService {
  private readonly logger = new Logger(AiServiceClientService.name);
  private readonly aiServiceUrl: string;
  private readonly serviceToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:3001';
    this.serviceToken = this.configService.get<string>('BACKEND_SERVICE_TOKEN') || 'change-me-backend-service-token';
  }

  /**
   * Request AI service to process a quotation (generate estimation + validation).
   * This is a fire-and-forget async call - we don't wait for the result.
   */
  async requestQuotationProcessing(request: QuotationProcessRequest): Promise<void> {
    try {
      this.logger.log(`Requesting AI processing for quotation ${request.quotation_id}`);

      // Fire-and-forget: send request but don't await response
      firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/estimation/process`,
          request,
          {
            headers: {
              'Authorization': `Bearer ${this.serviceToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 60000, // 1 minute timeout
          },
        ),
      ).catch((error) => {
        this.logger.error(
          `Failed to request AI processing for quotation ${request.quotation_id}: ${error.message}`,
        );
      });

      this.logger.log(`AI processing request sent for quotation ${request.quotation_id}`);
    } catch (error) {
      this.logger.error(
        `Error sending AI processing request for quotation ${request.quotation_id}: ${error.message}`,
      );
    }
  }

  /**
   * Synchronously request AI processing and wait for the result.
   * Used for manual retry endpoint (Option C).
   */
  async requestQuotationProcessingSync(request: QuotationProcessRequest): Promise<{
    estimation: EstimationData;
    validation: ValidationData;
  }> {
    try {
      this.logger.log(`Synchronously requesting AI processing for quotation ${request.quotation_id}`);

      const response = await firstValueFrom(
        this.httpService.post(
          `${this.aiServiceUrl}/api/estimation/process`,
          request,
          {
            headers: {
              'Authorization': `Bearer ${this.serviceToken}`,
              'Content-Type': 'application/json',
            },
            timeout: 120000, // 2 minutes timeout for sync call
          },
        ),
      );

      this.logger.log(`AI processing completed for quotation ${request.quotation_id}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Sync AI processing failed for quotation ${request.quotation_id}: ${error.message}`,
      );
      throw new Error(`AI service unavailable: ${error.message}`);
    }
  }
}
