import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../bedrock/bedrock.service';
import { KnowledgeLoaderService } from '../knowledge/knowledge-loader.service';
import * as fs from 'fs';
import * as path from 'path';

export interface QuotationData {
  quotation_id: string;
  project_name: string;
  project_code: string;
  form_data: any;
  submitted_at: string;
  submitted_by: string;
}

export interface EstimationResult {
  quotation_id: string;
  estimation_data: {
    summary: {
      total_capex: number;
      total_opex_year_1: number;
      total_first_year: number;
      total_5_years: number;
    };
    breakdown: any;
    line_items: any[];
    assumptions: string[];
    confidence_score: number;
  };
  generated_by: string;
  generated_at: string;
}

@Injectable()
export class EstimationAgentService {
  private readonly logger = new Logger(EstimationAgentService.name);
  private readonly agentSkill: string;

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly knowledgeLoader: KnowledgeLoaderService,
  ) {
    // Load agent skill prompt from file
    const skillPath = path.join(__dirname, '../../prompts/estimation-agent-prompt.md');
    if (fs.existsSync(skillPath)) {
      this.agentSkill = fs.readFileSync(skillPath, 'utf-8');
      this.logger.log('Estimation agent skill loaded');
    } else {
      this.logger.warn('Estimation agent skill file not found, using embedded prompt');
      this.agentSkill = this.getDefaultPrompt();
    }
  }

  /**
   * Generate cost estimation for a quotation
   */
  async generateEstimation(quotationData: QuotationData): Promise<EstimationResult> {
    this.logger.log(`Generating estimation for quotation ${quotationData.quotation_id}`);

    const knowledgeBase = this.knowledgeLoader.getKnowledgeBase();

    // Build system prompt with knowledge base
    const systemPrompt = this.buildSystemPrompt(knowledgeBase);

    // Build user message with quotation data
    const userMessage = this.buildUserMessage(quotationData);

    const startTime = Date.now();

    try {
      const response = await this.bedrockService.invoke({
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
        maxTokens: 16000,
        temperature: 1.0,
      });

      const latency = Date.now() - startTime;
      this.logger.log(
        `Estimation generated in ${latency}ms (input: ${response.usage.inputTokens}, output: ${response.usage.outputTokens})`,
      );

      // Parse JSON response
      const estimationData = this.parseEstimationResponse(response.content);

      return {
        quotation_id: quotationData.quotation_id,
        estimation_data: estimationData,
        generated_by: 'estimation-agent-v1',
        generated_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to generate estimation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build system prompt with knowledge base context
   */
  private buildSystemPrompt(knowledgeBase: any): string {
    return `${this.agentSkill}

## Knowledge Base

### Infrastructure Costs
${knowledgeBase.infrastructureCosts}

### Software Licenses
${knowledgeBase.softwareLicenses}

### Professional Services
${knowledgeBase.professionalServices}

### Pricing Rules
${knowledgeBase.pricingRules}

### Validation Thresholds
${knowledgeBase.validationThresholds}`;
  }

  /**
   * Build user message with quotation data
   */
  private buildUserMessage(quotationData: QuotationData): string {
    return `Generate a complete cost estimation for the following quotation:

## Quotation Details

**Project Name:** ${quotationData.project_name}
**Project Code:** ${quotationData.project_code}
**Quotation ID:** ${quotationData.quotation_id}
**Submitted:** ${quotationData.submitted_at}

## Form Data

\`\`\`json
${JSON.stringify(quotationData.form_data, null, 2)}
\`\`\`

Please provide a complete estimation following the output format defined in your instructions.`;
  }

  /**
   * Parse AI response into structured estimation data
   */
  private parseEstimationResponse(content: string): any {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    try {
      const parsed = JSON.parse(jsonString);
      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse estimation response: ${error.message}`);
      this.logger.debug(`Response content: ${content}`);
      throw new Error('Invalid estimation response format');
    }
  }

  /**
   * Default embedded prompt (fallback if file not found)
   */
  private getDefaultPrompt(): string {
    return `You are an AI cost estimation agent for IT infrastructure projects.

Your role is to generate accurate CAPEX and OPEX cost estimations based on:
1. Quotation form data (project requirements)
2. Knowledge base cost tables (infrastructure, licenses, services)
3. Pricing rules (CAPEX/OPEX classification, VAT, multipliers)

Output Format (JSON):
{
  "summary": {
    "total_capex": number,
    "total_opex_year_1": number,
    "total_first_year": number,
    "total_5_years": number
  },
  "breakdown": {
    "capex": { ... },
    "opex": { ... }
  },
  "line_items": [ ... ],
  "assumptions": [ ... ],
  "confidence_score": number
}

Rules:
- All prices in EUR
- CAPEX: one-time costs (licenses, setup, professional services)
- OPEX: recurring costs (VMs, storage, maintenance, support)
- Apply VAT 22% where specified
- Document all assumptions
- Calculate 5-year projections for OPEX`;
  }
}
