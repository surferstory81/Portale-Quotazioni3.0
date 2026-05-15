import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeBase {
  // Costs
  costs: {
    devopsPipeline: string;
    qaInfrastructure: string;
    loadTesting: string;
    dynatraceMonitoring: string;
    professionalServices: string;
    professionalServicesCosts: string;
    infrastructure: string;
    softwareLicenses: string;
  };

  // Rules
  rules: {
    pricing: string;
    projectClassification: string;
  };

  // Mapping
  mapping: {
    fieldToCost: string;
  };
}

@Injectable()
export class KnowledgeLoaderService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeLoaderService.name);
  private knowledgeBase: KnowledgeBase;
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    // New path: src/knowledge/
    this.basePath = path.join(__dirname, '../knowledge');
  }

  async onModuleInit() {
    this.logger.log(`Loading knowledge base from ${this.basePath}`);
    await this.loadKnowledgeBase();
    this.logger.log('Knowledge base loaded successfully');
  }

  /**
   * Load all knowledge base markdown files from organized structure
   */
  private async loadKnowledgeBase(): Promise<void> {
    const files = {
      costs: {
        devopsPipeline: 'costs/devops-pipeline-costs.md',
        qaInfrastructure: 'costs/qa-quality-assurance-costs.md',
        loadTesting: 'costs/load-testing-costs.md',
        dynatraceMonitoring: 'costs/dynatrace-dashboard-costs.md',
        professionalServices: 'costs/professional-services.md',
        professionalServicesCosts: 'costs/professional-services-costs.md',
        infrastructure: 'costs/infrastructure-costs.md',
        softwareLicenses: 'costs/software-licenses.md',
      },
      rules: {
        pricing: 'rules/pricing-rules.md',
        projectClassification: 'rules/project-classification-bands.md',
      },
      mapping: {
        fieldToCost: 'mapping/field-to-cost-mapping.md',
      },
    };

    this.knowledgeBase = {
      costs: {} as any,
      rules: {} as any,
      mapping: {} as any,
    };

    // Load costs
    for (const [key, filename] of Object.entries(files.costs)) {
      const filePath = path.join(this.basePath, filename);
      try {
        this.knowledgeBase.costs[key] = fs.readFileSync(filePath, 'utf-8');
        this.logger.debug(`Loaded ${filename} (${this.knowledgeBase.costs[key].length} bytes)`);
      } catch (error) {
        this.logger.error(`Failed to load ${filename}: ${error.message}`);
        throw new Error(`Knowledge base file missing: ${filename}`);
      }
    }

    // Load rules
    for (const [key, filename] of Object.entries(files.rules)) {
      const filePath = path.join(this.basePath, filename);
      try {
        this.knowledgeBase.rules[key] = fs.readFileSync(filePath, 'utf-8');
        this.logger.debug(`Loaded ${filename} (${this.knowledgeBase.rules[key].length} bytes)`);
      } catch (error) {
        this.logger.error(`Failed to load ${filename}: ${error.message}`);
        throw new Error(`Knowledge base file missing: ${filename}`);
      }
    }

    // Load mapping
    for (const [key, filename] of Object.entries(files.mapping)) {
      const filePath = path.join(this.basePath, filename);
      try {
        this.knowledgeBase.mapping[key] = fs.readFileSync(filePath, 'utf-8');
        this.logger.debug(`Loaded ${filename} (${this.knowledgeBase.mapping[key].length} bytes)`);
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
   * Get all knowledge as concatenated string (for backward compatibility)
   */
  getKnowledgeAsString(): string {
    const kb = this.getKnowledgeBase();

    const sections = [
      '# KNOWLEDGE BASE - COSTS',
      kb.costs.devopsPipeline,
      kb.costs.qaInfrastructure,
      kb.costs.loadTesting,
      kb.costs.dynatraceMonitoring,
      kb.costs.professionalServices,
      kb.costs.professionalServicesCosts,
      kb.costs.infrastructure,
      kb.costs.softwareLicenses,
      '',
      '# KNOWLEDGE BASE - RULES',
      kb.rules.pricing,
      kb.rules.projectClassification,
      '',
      '# KNOWLEDGE BASE - MAPPING',
      kb.mapping.fieldToCost,
    ];

    return sections.join('\n\n');
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
