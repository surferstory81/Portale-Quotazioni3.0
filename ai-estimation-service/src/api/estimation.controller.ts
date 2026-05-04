import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { EstimationAgentService } from '../agents/estimation-agent.service';
import { ValidationAgentService } from '../agents/validation-agent.service';
import { BackendApiService } from '../queue/backend-api.service';
import { ServiceAuthGuard } from '../guards/service-auth.guard';

interface ProcessQuotationRequest {
  quotation_id: string;
  user_id: string;
  project_code: string;
  status: string;
}

@Controller('api/estimation')
@UseGuards(ServiceAuthGuard)
export class EstimationController {
  private readonly logger = new Logger(EstimationController.name);

  constructor(
    private readonly estimationAgent: EstimationAgentService,
    private readonly validationAgent: ValidationAgentService,
    private readonly backendApi: BackendApiService,
  ) {}

  @Post('process')
  async processQuotation(@Body() request: ProcessQuotationRequest) {
    const { quotation_id } = request;

    this.logger.log(`Processing quotation ${quotation_id} via HTTP`);

    try {
      // Step 1: Fetch full quotation data from backend
      this.logger.log(`Fetching quotation data for ${quotation_id}`);
      const quotationData = await this.backendApi.getQuotation(quotation_id);

      // Step 2: Generate estimation
      this.logger.log(`Generating estimation for ${quotation_id}`);
      const estimation = await this.estimationAgent.generateEstimation(quotationData);

      // Step 3: Save estimation to backend
      this.logger.log(`Saving estimation to backend`);
      const savedEstimation = await this.backendApi.saveEstimation(estimation);

      // Step 4: Validate estimation
      this.logger.log(`Validating estimation ${savedEstimation.id}`);
      const validation = await this.validationAgent.validateEstimation(
        savedEstimation.id,
        estimation,
      );

      // Step 5: Save validation to backend
      this.logger.log(`Saving validation to backend`);
      await this.backendApi.saveValidation(validation);

      this.logger.log(`Quotation ${quotation_id} processed successfully`);

      return {
        success: true,
        quotation_id,
        estimation: savedEstimation,
        validation,
      };
    } catch (error) {
      this.logger.error(`Failed to process quotation ${quotation_id}: ${error.message}`);
      throw error;
    }
  }
}
