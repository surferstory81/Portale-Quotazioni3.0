import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { BedrockModule } from './bedrock/bedrock.module';
import { KnowledgeLoaderModule } from './knowledge/knowledge-loader.module';
import { AgentsModule } from './agents/agents.module';
import { QueueModule } from './queue/queue.module';
import { ToolsModule } from './tools/tools.module';
import { LogsModule } from './logs/logs.module';
import { HealthController } from './health.controller';
import { EstimationController } from './api/estimation.controller';
import { ExportService } from './api/export.service';
import { ServiceAuthGuard } from './guards/service-auth.guard';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    HttpModule,
    BedrockModule,
    KnowledgeLoaderModule,
    AgentsModule,
    QueueModule,
    ToolsModule,
    LogsModule,
  ],
  controllers: [HealthController, EstimationController],
  providers: [ServiceAuthGuard, ExportService],
})
export class AppModule {}
