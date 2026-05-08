import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { VERSION_INFO } from '../../version';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: VERSION_INFO.version,
      buildDate: VERSION_INFO.buildDate,
    };
  }

  @Get('ready')
  async ready() {
    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException('Database not reachable');
    }
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
