import { Controller, Get } from '@nestjs/common';
import { BedrockService } from './bedrock/bedrock.service';
import { VERSION_INFO } from './version';

@Controller('health')
export class HealthController {
  constructor(private readonly bedrockService: BedrockService) {}

  @Get()
  health() {
    const circuitStatus = this.bedrockService.getCircuitStatus();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'ai-estimation-service',
      version: VERSION_INFO.version,
      buildDate: VERSION_INFO.buildDate,
      bedrock: {
        circuitBreaker: circuitStatus,
      },
    };
  }

  @Get('ready')
  ready() {
    const circuitStatus = this.bedrockService.getCircuitStatus();
    if (circuitStatus.open) {
      return {
        status: 'not_ready',
        reason: 'Circuit breaker open',
        ...circuitStatus,
      };
    }
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }
}
