import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Log } from '../../entities/log.entity';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { FileLoggerService } from '../../common/logger/file-logger.service';

@Module({
  imports: [TypeOrmModule.forFeature([Log])],
  controllers: [LogsController],
  providers: [LogsService, FileLoggerService],
  exports: [LogsService, FileLoggerService],
})
export class LogsModule {}
