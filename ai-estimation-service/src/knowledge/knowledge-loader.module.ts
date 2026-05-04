import { Module } from '@nestjs/common';
import { KnowledgeLoaderService } from './knowledge-loader.service';

@Module({
  providers: [KnowledgeLoaderService],
  exports: [KnowledgeLoaderService],
})
export class KnowledgeLoaderModule {}
