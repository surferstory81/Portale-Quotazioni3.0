import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeBase {
  infrastructureCosts: string;
  softwareLicenses: string;
  professionalServices: string;
  pricingRules: string;
  validationThresholds: string;
}

@Injectable()
export class KnowledgeLoaderService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeLoaderService.name);
  private knowledgeBase: KnowledgeBase;
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    this.basePath = this.configService.get<string>('knowledgeBase.path');
  }

  async onModuleInit() {
    this.logger.log(`Loading knowledge base from ${this.basePath}`);
    await this.loadKnowledgeBase();
    this.logger.log('Knowledge base loaded successfully');
  }

  /**
   * Load all knowledge base markdown files
   */
  private async loadKnowledgeBase(): Promise<void> {
    const files = {
      infrastructureCosts: 'infrastructure-costs.md',
      softwareLicenses: 'software-licenses.md',
      professionalServices: 'professional-services.md',
      pricingRules: 'pricing-rules.md',
      validationThresholds: 'validation-thresholds.md',
    };

    this.knowledgeBase = {} as KnowledgeBase;

    for (const [key, filename] of Object.entries(files)) {
      const filePath = path.join(this.basePath, filename);
      try {
        this.knowledgeBase[key] = fs.readFileSync(filePath, 'utf-8');
        this.logger.debug(`Loaded ${filename} (${this.knowledgeBase[key].length} bytes)`);
      } catch (error) {
        this.logger.error(`Failed to load ${filename}: ${error.message}`);
        throw new Error(`Knowledge base file missing: ${filename}`);
      }
    }
  }

  /**
   * Get the full knowledge base
   */
  getKnowledgeBase(): KnowledgeBase {
    if (!this.knowledgeBase) {
      throw new Error('Knowledge base not loaded');
    }
    return this.knowledgeBase;
  }

  /**
   * Get a specific knowledge base file
   */
  getFile(key: keyof KnowledgeBase): string {
    if (!this.knowledgeBase) {
      throw new Error('Knowledge base not loaded');
    }
    return this.knowledgeBase[key];
  }

  /**
   * Reload knowledge base (for hot-reload scenarios)
   */
  async reload(): Promise<void> {
    this.logger.log('Reloading knowledge base');
    await this.loadKnowledgeBase();
    this.logger.log('Knowledge base reloaded');
  }
}
