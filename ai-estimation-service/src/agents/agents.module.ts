import { Module } from '@nestjs/common';
import { EstimationAgentService } from './estimation/estimation.service';
import { ValidationAgentService } from './validation/validation.service';
import { BedrockModule } from '../bedrock/bedrock.module';
import { KnowledgeLoaderModule } from '../knowledge/knowledge-loader.module';
import { ToolsModule } from '../tools/tools.module';

@Module({
  imports: [BedrockModule, KnowledgeLoaderModule, ToolsModule],
  providers: [EstimationAgentService, ValidationAgentService],
  exports: [EstimationAgentService, ValidationAgentService],
})
export class AgentsModule {}
