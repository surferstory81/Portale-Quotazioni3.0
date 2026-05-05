import { Module } from '@nestjs/common';
import { BackendApiService } from './backend-api.service';
import { AgentsModule } from '../agents/agents.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [AgentsModule, HttpModule],
  providers: [BackendApiService],
  exports: [BackendApiService],
})
export class QueueModule {}
