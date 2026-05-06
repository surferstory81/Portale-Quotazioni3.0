import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIEstimation } from '../../entities/ai-estimation.entity';
import { Quotation } from '../../entities/quotation.entity';
import { AIEstimationService } from './ai-estimation.service';
import { AIEstimationController } from './ai-estimation.controller';
import { AiServiceClientService } from './ai-service-client.service';
import { AIEstimationProgressService } from './ai-estimation-progress.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    TypeOrmModule.forFeature([AIEstimation, Quotation]),
    HttpModule,
  ],
  controllers: [AIEstimationController],
  providers: [AIEstimationService, AiServiceClientService, AIEstimationProgressService],
  exports: [AIEstimationService, AiServiceClientService, AIEstimationProgressService],
})
export class AIEstimationModule {}
