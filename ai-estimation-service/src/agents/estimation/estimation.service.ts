import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../bedrock/bedrock.service';
import { KnowledgeLoaderService } from '../../knowledge/knowledge-loader.service';
import { PricingToolsService } from '../../tools/pricing-tools.service';
import { getModelConfigById } from '../../config/models.config';
import * as fs from 'fs';
import * as path from 'path';

export interface QuotationData {
  quotation_id: string;
  project_name: string;
  project_code: string;
  form_data: any; // Structured form data from transformer
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
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  model_id?: string;
  model_name?: string;
}

@Injectable()
export class EstimationAgentService {
  private readonly logger = new Logger(EstimationAgentService.name);
  private readonly agentSkill: string;

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly knowledgeLoader: KnowledgeLoaderService,
    private readonly pricingTools: PricingToolsService,
  ) {
    // Load agent skill prompt from file
    const skillPath = path.join(__dirname, 'estimation.prompt.md');
    if (fs.existsSync(skillPath)) {
      this.agentSkill = fs.readFileSync(skillPath, 'utf-8');
      this.logger.log('Estimation agent skill loaded from estimation.prompt.md');
    } else {
      this.logger.warn('Estimation agent skill file not found, using embedded prompt');
      this.agentSkill = this.getDefaultPrompt();
    }
  }

  /**
   * Generate cost estimation for a quotation
   * Supports multi-turn tool use for fetching live pricing
   */
  async generateEstimation(quotationData: QuotationData, modelId?: string): Promise<EstimationResult> {
    this.logger.log(`Generating estimation for quotation ${quotationData.quotation_id}${modelId ? ` with model ${modelId}` : ''}`);

    const knowledgeBaseString = this.knowledgeLoader.getKnowledgeAsString();
    const systemPrompt = this.buildSystemPrompt(knowledgeBaseString);
    const userMessage = this.buildUserMessage(quotationData);
    const availableTools = this.pricingTools.getAvailableTools();

    const startTime = Date.now();
    const messages: any[] = [{ role: 'user', content: userMessage }];
    let totalTokensUsed = { input: 0, output: 0 };
    let turnCount = 0;
    const maxTurns = 5; // Prevent infinite loops

    try {
      // Multi-turn conversation loop for tool use
      while (turnCount < maxTurns) {
        turnCount++;
        this.logger.log(`Turn ${turnCount}: Invoking AI model`);

        const response = await this.bedrockService.invoke({
          system: systemPrompt,
          systemCacheable: true,
          tools: availableTools.length > 0 ? availableTools : undefined,
          messages,
          maxTokens: 16000,
          temperature: 1.0,
          modelId, // Pass modelId override if provided
        });

        totalTokensUsed.input += response.usage.inputTokens;
        totalTokensUsed.output += response.usage.outputTokens;

        // Add assistant response to conversation
        messages.push({
          role: 'assistant',
          content: response.content,
        });

        // Check if AI wants to use tools
        if (response.stopReason === 'tool_use' && response.toolUse) {
          this.logger.log(`AI requested ${response.toolUse.length} tool(s)`);

          // Execute all requested tools
          const toolResults = await Promise.all(
            response.toolUse.map(async (tool) => {
              this.logger.log(`Executing tool: ${tool.name}`);
              const result = await this.pricingTools.executeTool(tool.name, tool.input);
              return {
                toolUseId: tool.toolUseId,
                content: result,
              };
            }),
          );

          // Add tool results to conversation
          messages.push({
            role: 'user',
            content: JSON.stringify({ tool_results: toolResults }),
          });

          // Continue to next turn
          continue;
        }

        // No more tools requested, we have final answer
        this.logger.log(`Final answer received after ${turnCount} turn(s)`);
        break;
      }

      const latency = Date.now() - startTime;
      this.logger.log(
        `Estimation generated in ${latency}ms, ${turnCount} turns (input: ${totalTokensUsed.input}, output: ${totalTokensUsed.output})`,
      );

      // Get final response content
      const finalResponse = messages[messages.length - 1];
      const estimationData = this.parseEstimationResponse(finalResponse.content);

      // Calculate cost based on model used
      const modelConfig = modelId ? getModelConfigById(modelId) : null;
      const inputCostPerMillion = modelConfig?.inputCostPer1M || 3.0; // Default to Sonnet 4.5 pricing
      const outputCostPerMillion = modelConfig?.outputCostPer1M || 15.0;
      const estimatedCost =
        (totalTokensUsed.input / 1_000_000 * inputCostPerMillion) +
        (totalTokensUsed.output / 1_000_000 * outputCostPerMillion);

      this.logger.log(
        `Model pricing: ${modelConfig?.displayName || 'default'} (input: $${inputCostPerMillion}/MTok, output: $${outputCostPerMillion}/MTok) = $${estimatedCost.toFixed(6)}`,
      );

      return {
        quotation_id: quotationData.quotation_id,
        estimation_data: estimationData,
        generated_by: `estimation-agent-v1-tools (${turnCount} turns)`,
        generated_at: new Date().toISOString(),
        input_tokens: totalTokensUsed.input,
        output_tokens: totalTokensUsed.output,
        estimated_cost_usd: estimatedCost,
        model_id: modelId,
        model_name: modelConfig?.displayName,
      };
    } catch (error) {
      this.logger.error(`Failed to generate estimation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build system prompt with knowledge base context
   */
  private buildSystemPrompt(knowledgeBase: string): string {
    return `${this.agentSkill}

## Knowledge Base

${knowledgeBase}`;
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
