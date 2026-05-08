import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { FileLoggerService } from '../../common/logger/file-logger.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('api/logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class LogsController {
  constructor(private readonly fileLogger: FileLoggerService) {}

  /**
   * Get list of available log files
   */
  @Get('files')
  getLogFiles() {
    const files = this.fileLogger.getLogFiles();
    return {
      files: files.map((filename) => ({
        filename,
        path: `/api/logs/view/${filename}`,
        statsPath: `/api/logs/stats/${filename}`,
      })),
    };
  }

  /**
   * View log file content
   */
  @Get('view/:filename')
  viewLog(
    @Param('filename') filename: string,
    @Query('lines') lines?: string,
  ) {
    const lineCount = lines ? parseInt(lines, 10) : 100;
    const logs = this.fileLogger.readLogFile(filename, lineCount);

    return {
      filename,
      lineCount: logs.length,
      logs,
    };
  }

  /**
   * Get log file statistics
   */
  @Get('stats/:filename')
  getLogStats(@Param('filename') filename: string) {
    const stats = this.fileLogger.getLogStats(filename);

    return {
      filename,
      ...stats,
    };
  }

  /**
   * Get latest logs across all files
   */
  @Get('latest')
  getLatestLogs(@Query('lines') lines?: string) {
    const lineCount = lines ? parseInt(lines, 10) : 50;
    const files = this.fileLogger.getLogFiles();

    if (files.length === 0) {
      return { logs: [] };
    }

    // Read latest file
    const latestFile = files[0];
    const logs = this.fileLogger.readLogFile(latestFile, lineCount);

    return {
      filename: latestFile,
      lineCount: logs.length,
      logs,
    };
  }
}
