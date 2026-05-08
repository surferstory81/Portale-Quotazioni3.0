import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile = require('winston-daily-rotate-file');
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class FileLoggerService implements LoggerService {
  private logger: winston.Logger;
  private readonly logsDir: string;

  constructor() {
    // Ensure logs directory exists
    this.logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    // Create Winston logger with daily rotation
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      defaultMeta: { service: 'ai-estimation' },
      transports: [
        // Daily rotate file for all logs
        new DailyRotateFile({
          dirname: this.logsDir,
          filename: 'ai-estimation-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: false,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'info',
        }),
        // Separate file for errors
        new DailyRotateFile({
          dirname: this.logsDir,
          filename: 'ai-estimation-error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: false,
          maxSize: '20m',
          maxFiles: '14d',
          level: 'error',
        }),
        // Console output with colors for development
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
              let log = `${timestamp} [${level}] ${context ? `[${context}] ` : ''}${message}`;
              if (Object.keys(meta).length > 0) {
                log += ` ${JSON.stringify(meta)}`;
              }
              if (stack) {
                log += `\n${stack}`;
              }
              return log;
            }),
          ),
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { context, stack: trace });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  /**
   * Get list of available log files
   */
  getLogFiles(): string[] {
    const files = fs.readdirSync(this.logsDir);
    return files
      .filter((file) => file.endsWith('.log'))
      .sort()
      .reverse(); // Most recent first
  }

  /**
   * Read log file content
   */
  readLogFile(filename: string, lines: number = 100): any[] {
    const filePath = path.join(this.logsDir, filename);

    // Security check: prevent directory traversal
    if (!filePath.startsWith(this.logsDir)) {
      throw new Error('Invalid log file path');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('Log file not found');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const logLines = content
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .slice(-lines) // Get last N lines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return { message: line, level: 'info' };
        }
      });

    return logLines;
  }

  /**
   * Get log statistics
   */
  getLogStats(filename: string): { totalLines: number; byLevel: Record<string, number>; fileSize: number } {
    const filePath = path.join(this.logsDir, filename);

    if (!filePath.startsWith(this.logsDir) || !fs.existsSync(filePath)) {
      throw new Error('Invalid or non-existent log file');
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line) => line.trim().length > 0);

    const byLevel: Record<string, number> = {};
    lines.forEach((line) => {
      try {
        const log = JSON.parse(line);
        const level = log.level || 'unknown';
        byLevel[level] = (byLevel[level] || 0) + 1;
      } catch {
        byLevel['parse-error'] = (byLevel['parse-error'] || 0) + 1;
      }
    });

    const stats = fs.statSync(filePath);

    return {
      totalLines: lines.length,
      byLevel,
      fileSize: stats.size,
    };
  }
}
