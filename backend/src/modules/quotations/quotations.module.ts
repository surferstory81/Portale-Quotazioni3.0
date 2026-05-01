import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Quotation } from '../../entities/quotation.entity';
import { QuotationDetail } from '../../entities/quotation-detail.entity';
import { QuotationsService } from './quotations.service';
import { QuotationsController } from './quotations.controller';
import { EmailModule } from '../email/email.module';
import { AIEstimationModule } from '../ai-estimation/ai-estimation.module';

@Module({
  imports: [TypeOrmModule.forFeature([Quotation, QuotationDetail]), EmailModule, AIEstimationModule],
  controllers: [QuotationsController],
  providers: [QuotationsService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
