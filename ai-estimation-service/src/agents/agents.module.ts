import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EstimationAgentService } from './estimation/estimation.service';
import { ValidationAgentService } from './validation/validation.service';
import { FeedbackAgentService } from './feedback/feedback.service';
import { FeedbackController } from './feedback/feedback.controller';
import { BedrockModule } from '../bedrock/bedrock.module';
import { KnowledgeLoaderModule } from '../knowledge/knowledge-loader.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [
    BedrockModule,
    KnowledgeLoaderModule,
    ToolsModule,
    HttpModule,
  ],
  controllers: [FeedbackController],
  providers: [EstimationAgentService, ValidationAgentService, FeedbackAgentService],
  exports: [EstimationAgentService, ValidationAgentService, FeedbackAgentService],
})
export class AgentsModule {}
