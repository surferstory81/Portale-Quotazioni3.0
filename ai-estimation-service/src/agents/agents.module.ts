import { Module } from '@nestjs/common';
import { EstimationAgentService } from './estimation-agent.service';
import { ValidationAgentService } from './validation-agent.service';
import { BedrockModule } from '../bedrock/bedrock.module';
import { KnowledgeLoaderModule } from '../knowledge/knowledge-loader.module';

@Module({
  imports: [BedrockModule, KnowledgeLoaderModule],
  providers: [EstimationAgentService, ValidationAgentService],
  exports: [EstimationAgentService, ValidationAgentService],
})
export class AgentsModule {}
