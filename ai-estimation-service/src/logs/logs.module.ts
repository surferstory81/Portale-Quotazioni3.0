import { Module } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { FileLoggerService } from '../common/logger/file-logger.service';

@Module({
  controllers: [LogsController],
  providers: [FileLoggerService],
  exports: [FileLoggerService],
})
export class LogsModule {}
