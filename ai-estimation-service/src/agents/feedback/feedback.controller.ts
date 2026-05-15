import { Controller, Post, Body, Logger } from '@nestjs/common';
import { FeedbackAgentService, FeedbackAnalysis } from './feedback.service';

class AnalyzeFeedbackDto {
  days_back?: number;
}

@Controller('feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly feedbackService: FeedbackAgentService) {}

  /**
   * Analyze validation patterns and generate improvement recommendations
   *
   * POST /api/feedback/analyze
   * Body: { "days_back": 30 }
   *
   * Internal endpoint (no auth required - service is internal)
   */
  @Post('analyze')
  async analyzeFeedback(@Body() dto: AnalyzeFeedbackDto): Promise<FeedbackAnalysis> {
    const daysBack = dto.days_back || 30;

    this.logger.log(`Feedback analysis requested for last ${daysBack} days`);

    const analysis = await this.feedbackService.analyzeValidationPatterns(daysBack);

    this.logger.log(
      `Analysis complete: Health Score ${analysis.health_score}/100, ` +
      `${analysis.recommendations.length} recommendations`
    );

    return analysis;
  }
}
