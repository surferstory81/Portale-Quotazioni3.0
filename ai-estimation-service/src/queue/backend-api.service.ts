import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { EstimationResult } from '../agents/estimation-agent.service';
import { ValidationResult } from '../agents/validation-agent.service';

@Injectable()
export class BackendApiService {
  private readonly logger = new Logger(BackendApiService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private readonly serviceToken: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('backend.apiUrl');
    this.serviceToken = this.configService.get<string>('backend.serviceToken');

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceToken}`,
        'X-Service-Name': 'ai-estimation-service',
      },
    });

    this.logger.log(`Backend API client initialized (url: ${this.baseUrl})`);
  }

  /**
   * Get full quotation data
   */
  async getQuotation(quotationId: string): Promise<any> {
    try {
      const response = await this.client.get(`/quotations/${quotationId}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch quotation ${quotationId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save estimation to backend
   */
  async saveEstimation(estimation: EstimationResult): Promise<any> {
    try {
      const response = await this.client.post('/ai-estimation/generate', {
        quotationId: estimation.quotation_id,
        estimationData: estimation.estimation_data,
      });

      this.logger.log(`Estimation saved (id: ${response.data.id})`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to save estimation for quotation ${estimation.quotation_id}: ${error.message}`,
      );
      if (error.response?.data) {
        this.logger.error(`Backend response: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Save validation to backend
   */
  async saveValidation(validation: ValidationResult): Promise<any> {
    try {
      const response = await this.client.post('/ai-estimation/validate', {
        estimationId: validation.estimation_id,
        validationData: validation.validation_data,
      });

      this.logger.log(`Validation saved (estimation: ${validation.estimation_id})`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to save validation for estimation ${validation.estimation_id}: ${error.message}`,
      );
      if (error.response?.data) {
        this.logger.error(`Backend response: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }
}
