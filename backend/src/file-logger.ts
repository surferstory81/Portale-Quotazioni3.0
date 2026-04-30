import { LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export class FileLogger implements LoggerService {
  private logFile: string;

  constructor(filename = 'app.log') {
    const logDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    this.logFile = path.join(logDir, filename);
  }

  log(message: string) {
    this.writeToFile(`[LOG] ${new Date().toISOString()} ${message}`);
  }
  error(message: string, trace?: string) {
    this.writeToFile(`[ERROR] ${new Date().toISOString()} ${message} ${trace || ''}`);
  }
  warn(message: string) {
    this.writeToFile(`[WARN] ${new Date().toISOString()} ${message}`);
  }
  debug(message: string) {
    this.writeToFile(`[DEBUG] ${new Date().toISOString()} ${message}`);
  }
  verbose(message: string) {
    this.writeToFile(`[VERBOSE] ${new Date().toISOString()} ${message}`);
  }

  private writeToFile(msg: string) {
    fs.appendFileSync(this.logFile, msg + '\n');
  }
}
