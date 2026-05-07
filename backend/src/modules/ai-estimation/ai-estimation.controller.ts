import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Res,
  StreamableFile,
  Sse,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, map } from 'rxjs';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AIEstimationService } from './ai-estimation.service';
import { AIEstimationProgressService } from './ai-estimation-progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../../entities/user.entity';
import {
  ApproveEstimationDto,
  GenerateEstimationDto,
  RejectEstimationDto,
  ValidateEstimationDto,
} from './dto/ai-estimation.dto';

@ApiTags('ai-estimation')
@ApiBearerAuth()
@Controller('ai-estimation')
@UseGuards(JwtAuthGuard)
export class AIEstimationController {
  constructor(
    private readonly aiEstimationService: AIEstimationService,
    private readonly progressService: AIEstimationProgressService,
  ) {}

  /**
   * Internal endpoint: Generate estimation for a quotation.
   * Called by AI agent orchestration layer, not directly by frontend.
   */
  @Public()
  @Post('generate')
  @ApiOperation({
    summary: 'Genera stima AI (uso interno)',
    description:
      'Chiamato dal sistema di orchestrazione AI per salvare l\'output dell\'Estimation Agent',
  })
  async generateEstimation(@Body() dto: GenerateEstimationDto) {
    return this.aiEstimationService.generateEstimation(
      dto.quotationId,
      dto.estimationData,
      dto.inputTokens,
      dto.outputTokens,
      dto.estimatedCostUsd,
    );
  }

  /**
   * Internal endpoint: Validate an existing estimation.
   * Called by AI agent orchestration layer after Validation Agent runs.
   */
  @Public()
  @Post('validate')
  @ApiOperation({
    summary: 'Valida stima AI (uso interno)',
    description:
      'Chiamato dal sistema di orchestrazione AI per salvare il report del Validation Agent',
  })
  async validateEstimation(@Body() dto: ValidateEstimationDto) {
    return this.aiEstimationService.validateEstimation(
      dto.estimationId,
      dto.validationData,
    );
  }

  /**
   * Get estimation by quotation ID.
   * Users can only see HUMAN_APPROVED estimations.
   * Admins can see all estimations.
   */
  @Get('quotation/:quotationId')
  @ApiOperation({
    summary: 'Ottieni stima AI per una quotazione',
    description: 'Recupera la stima AI associata a una quotazione specifica. Gli utenti possono vedere solo stime approvate.',
  })
  async getEstimationByQuotationId(
    @Param('quotationId') quotationId: string,
    @CurrentUser() user: User,
  ) {
    const isAdmin = user.role?.name === 'ADMIN';
    return this.aiEstimationService.getEstimationByQuotationId(quotationId, isAdmin);
  }

  /**
   * Admin: List all estimations needing review.
   */
  @Get('needs-review')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Lista stime che richiedono revisione umana',
    description:
      'Recupera tutte le stime con stato AI_VALIDATED o AI_NEEDS_REVIEW',
  })
  async findEstimationsNeedingReview() {
    return this.aiEstimationService.findEstimationsNeedingReview();
  }

  /**
   * Admin: Get AI estimation statistics.
   */
  @Get('statistics')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Statistiche stime AI',
    description: 'Totale, suddivisione per stato, confidence media',
  })
  async getStatistics() {
    return this.aiEstimationService.getStatistics();
  }

  /**
   * Admin: Approve an AI estimation.
   */
  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Approva stima AI',
    description:
      'L\'amministratore approva la stima, aggiorna l\'importo della quotazione',
  })
  async approveEstimation(
    @Param('id') estimationId: string,
    @CurrentUser() admin: User,
    @Body() dto: ApproveEstimationDto,
  ) {
    return this.aiEstimationService.approveEstimation(
      estimationId,
      admin.id,
      dto.adminNotes,
    );
  }

  /**
   * Admin: Reject an AI estimation.
   */
  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Rifiuta stima AI',
    description:
      'L\'amministratore rifiuta la stima, deve fornire motivazione',
  })
  async rejectEstimation(
    @Param('id') estimationId: string,
    @CurrentUser() admin: User,
    @Body() dto: RejectEstimationDto,
  ) {
    return this.aiEstimationService.rejectEstimation(
      estimationId,
      admin.id,
      dto.adminNotes,
    );
  }

  /**
   * Admin: Retry AI estimation for existing quotation.
   * Useful for quotations created before AI service was deployed.
   */
  @Post('retry/:quotationId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Ri-triggera AI estimation per quotazione esistente',
    description:
      'Pubblica nuovamente l\'evento RabbitMQ per processare quotazioni già create. Utile per quotazioni caricate prima del deploy del servizio AI.',
  })
  async retryEstimation(
    @Param('quotationId') quotationId: string,
    @CurrentUser() admin: User,
  ) {
    return this.aiEstimationService.retryEstimation(quotationId, admin.id);
  }

  /**
   * Export AI estimation as PDF
   */
  @Get('export/pdf/:quotationId')
  @ApiOperation({
    summary: 'Esporta stima AI in formato PDF',
    description: 'Scarica il report della stima AI in formato PDF',
  })
  async exportPDF(@Param('quotationId') quotationId: string, @Res() res: Response) {
    const pdfBuffer = await this.aiEstimationService.exportPDF(quotationId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=stima-ai-${quotationId}.pdf`);
    res.send(pdfBuffer);
  }

  /**
   * Export AI estimation as Excel
   */
  @Get('export/excel/:quotationId')
  @ApiOperation({
    summary: 'Esporta stima AI in formato Excel',
    description: 'Scarica il report della stima AI in formato Excel',
  })
  async exportExcel(@Param('quotationId') quotationId: string, @Res() res: Response) {
    const excelBuffer = await this.aiEstimationService.exportExcel(quotationId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=stima-ai-${quotationId}.xlsx`);
    res.send(excelBuffer);
  }

  /**
   * Server-Sent Events: Progress updates for AI estimation
   */
  @Sse('progress/:quotationId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Stream progress eventi per stima AI',
    description: 'Server-Sent Events per monitorare il progresso della generazione stima AI in tempo reale',
  })
  estimationProgress(@Param('quotationId') quotationId: string): Observable<MessageEvent> {
    return this.progressService.getProgressObservable(quotationId).pipe(
      map((event) => ({
        data: event,
      } as MessageEvent)),
    );
  }
}
