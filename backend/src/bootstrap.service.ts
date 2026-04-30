import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class BootstrapService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Avvio bootstrap: esecuzione migrazioni...');

    try {
      const pending = await this.dataSource.showMigrations();

      if (pending) {
        await this.dataSource.runMigrations({ transaction: 'each' });
        this.logger.log('Migrazioni completate con successo.');
      } else {
        this.logger.log('Nessuna migrazione pendente.');
      }
    } catch (error) {
      this.logger.error('Errore durante le migrazioni', (error as Error).stack);
      throw error;
    }
  }
}
