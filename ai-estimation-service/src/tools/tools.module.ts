import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PricingToolsService } from './pricing-tools.service';

@Module({
  imports: [HttpModule],
  providers: [PricingToolsService],
  exports: [PricingToolsService],
})
export class ToolsModule {}
