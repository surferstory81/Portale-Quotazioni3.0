import { Injectable, Logger } from '@nestjs/common';
import { BedrockService } from '../../bedrock/bedrock.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';

export interface FeedbackAnalysis {
  analysis_period: string;
  health_score: number;
  summary: {
    critical_issues: number;
    high_priority_issues: number;
    medium_priority_issues: number;
    low_priority_issues: number;
  };
  recommendations: Array<{
    priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: 'KNOWLEDGE_GAP' | 'PROMPT_CLARITY' | 'THRESHOLD_CALIBRATION' | 'EDGE_CASE';
    issue_pattern: string;
    root_cause: string;
    affected_estimations_pct: number;
    specific_fix: {
      file: string;
      action: 'ADD' | 'UPDATE' | 'REMOVE';
      location: string;
      content: string;
    };
    alternative_fix?: {
      file: string;
      action: 'ADD' | 'UPDATE' | 'REMOVE';
      location: string;
      content: string;
    };
    validation_test: string;
  }>;
  trends: {
    improving: string[];
    worsening: string[];
    stable: string[];
  };
  next_review_date: string;
  generated_at: string;
}

@Injectable()
export class FeedbackAgentService {
  private readonly logger = new Logger(FeedbackAgentService.name);
  private readonly agentSkill: string;
  private readonly backendUrl: string;
  private readonly serviceToken: string;

  constructor(
    private readonly bedrockService: BedrockService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.backendUrl = this.configService.get<string>('BACKEND_URL') || 'http://localhost:3000';
    this.serviceToken = this.configService.get<string>('SERVICE_TOKEN') || 'change-me-service-token';
    const skillPath = path.join(__dirname, 'feedback.prompt.md');
    if (fs.existsSync(skillPath)) {
      this.agentSkill = fs.readFileSync(skillPath, 'utf-8');
      this.logger.log('Feedback agent skill loaded from feedback.prompt.md');
    } else {
      this.logger.warn('Feedback agent skill file not found');
      this.agentSkill = this.getDefaultPrompt();
    }
  }

  /**
   * Analyze validation patterns and generate improvement recommendations
   */
  async analyzeValidationPatterns(daysBack: number = 30): Promise<FeedbackAnalysis> {
    this.logger.log(`[FEEDBACK-AGENT] ═══════════════════════════════════════════`);
    this.logger.log(`[FEEDBACK-AGENT] Analyzing validation patterns (last ${daysBack} days)`);
    this.logger.log(`[FEEDBACK-AGENT] ═══════════════════════════════════════════`);

    // Fetch estimations with validation data from backend
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    let estimations: any[];
    try {
      const response = await firstValueFrom(
        this.httpService.get(
          `${this.backendUrl}/api/ai-estimation/all`,
          {
            headers: {
              'Authorization': `Bearer ${this.serviceToken}`,
            },
            params: {
              start_date: startDate.toISOString(),
              has_validation: true,
            },
            timeout: 30000,
          },
        ),
      );
      estimations = response.data;
    } catch (error) {
      this.logger.error(`[FEEDBACK-AGENT] Failed to fetch estimations: ${error.message}`);
      estimations = [];
    }

    this.logger.log(`[FEEDBACK-AGENT] Found ${estimations.length} estimations with validation data`);

    if (estimations.length === 0) {
      this.logger.warn('[FEEDBACK-AGENT] No validation data available for analysis');
      return this.getEmptyAnalysis(startDate, new Date());
    }

    // Aggregate validation data
    const aggregatedData = this.aggregateValidationData(estimations, startDate);

    // Build prompt for AI analysis
    const systemPrompt = this.agentSkill;
    const userMessage = this.buildAnalysisPrompt(aggregatedData);

    const startTime = Date.now();

    try {
      this.logger.log(`[FEEDBACK-AGENT] Invoking AI model for pattern analysis...`);

      const response = await this.bedrockService.invoke({
        system: systemPrompt,
        systemCacheable: false, // Feedback analysis changes frequently
        messages: [{ role: 'user', content: userMessage }],
        maxTokens: 16000,
        temperature: 1.0,
      });

      const latency = Date.now() - startTime;

      this.logger.log(`[FEEDBACK-AGENT] Analysis completed in ${latency}ms (${(latency/1000).toFixed(1)}s)`);
      this.logger.log(`[FEEDBACK-AGENT] Tokens: input=${response.usage.inputTokens}, output=${response.usage.outputTokens}`);

      const analysis = this.parseAnalysisResponse(response.content);

      this.logger.log(`[FEEDBACK-AGENT] Health Score: ${analysis.health_score}/100`);
      this.logger.log(`[FEEDBACK-AGENT] Recommendations: ${analysis.recommendations.length}`);
      this.logger.log(`[FEEDBACK-AGENT]   - CRITICAL: ${analysis.summary.critical_issues}`);
      this.logger.log(`[FEEDBACK-AGENT]   - HIGH: ${analysis.summary.high_priority_issues}`);
      this.logger.log(`[FEEDBACK-AGENT]   - MEDIUM: ${analysis.summary.medium_priority_issues}`);
      this.logger.log(`[FEEDBACK-AGENT]   - LOW: ${analysis.summary.low_priority_issues}`);
      this.logger.log(`[FEEDBACK-AGENT] ═══════════════════════════════════════════`);

      return analysis;
    } catch (error) {
      this.logger.error(`[FEEDBACK-AGENT] Analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Aggregate validation data from multiple estimations
   */
  private aggregateValidationData(estimations: any[], startDate: Date): any {
    const validationSummary = {
      APPROVE: 0,
      REVIEW: 0,
      SENIOR_REVIEW: 0,
      REJECT: 0,
    };

    const issuesByCategory = new Map<string, { HIGH: number; MEDIUM: number; LOW: number }>();
    const topIssues = new Map<string, any>();

    for (const estimation of estimations) {
      const validation = estimation.validationData as any;

      // Count decisions
      validationSummary[validation.decision] = (validationSummary[validation.decision] || 0) + 1;

      // Aggregate issues
      if (validation.issues && validation.issues.length > 0) {
        for (const issue of validation.issues) {
          const category = issue.category || 'UNKNOWN';

          // Count by category
          if (!issuesByCategory.has(category)) {
            issuesByCategory.set(category, { HIGH: 0, MEDIUM: 0, LOW: 0 });
          }
          issuesByCategory.get(category)![issue.severity]++;

          // Track unique issue patterns
          const issueKey = `${category}:${issue.severity}:${issue.message}`;
          if (!topIssues.has(issueKey)) {
            topIssues.set(issueKey, {
              count: 0,
              severity: issue.severity,
              category,
              message: issue.message,
              recommendation: issue.recommendation,
              affected_projects: [],
            });
          }
          const issueData = topIssues.get(issueKey)!;
          issueData.count++;
          issueData.affected_projects.push(estimation.quotationId);
        }
      }
    }

    // Convert to sorted arrays
    const issuesByCategoryArray = Object.fromEntries(issuesByCategory);
    const topIssuesArray = Array.from(topIssues.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 most common issues

    // Include sample estimations (last 5 with issues)
    const sampleEstimations = estimations
      .filter(e => (e.validationData as any)?.issues?.length > 0)
      .slice(0, 5)
      .map(e => ({
        quotation_id: e.quotationId,
        estimation_data: e.estimationData,
        validation_data: e.validationData,
        ai_status: e.aiStatus,
      }));

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${new Date().toISOString().split('T')[0]}`,
      total_estimations: estimations.length,
      validation_summary: validationSummary,
      issues_by_category: issuesByCategoryArray,
      top_issues: topIssuesArray,
      sample_estimations: sampleEstimations,
    };
  }

  /**
   * Build prompt for AI analysis
   */
  private buildAnalysisPrompt(aggregatedData: any): string {
    return `Analyze the following validation data and provide recommendations for improving the estimation agent:

## Aggregated Validation Data

\`\`\`json
${JSON.stringify(aggregatedData, null, 2)}
\`\`\`

Please identify patterns, root causes, and provide actionable recommendations following the output format defined in your instructions.

Focus on:
1. Issues appearing in >20% of estimations (high priority)
2. Systematic gaps that cause repeated errors
3. Specific changes to knowledge base or prompts
4. Validation tests to verify improvements

Provide your analysis in JSON format.`;
  }

  /**
   * Parse AI analysis response
   */
  private parseAnalysisResponse(content: string): FeedbackAnalysis {
    const jsonMatch = content.match(/```json\n([\s\S]+?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;

    try {
      const parsed = JSON.parse(jsonString);
      parsed.generated_at = new Date().toISOString();
      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse feedback analysis: ${error.message}`);
      throw new Error('Invalid feedback analysis response format');
    }
  }

  /**
   * Get empty analysis when no data available
   */
  private getEmptyAnalysis(startDate: Date, endDate: Date): FeedbackAnalysis {
    return {
      analysis_period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      health_score: 0,
      summary: {
        critical_issues: 0,
        high_priority_issues: 0,
        medium_priority_issues: 0,
        low_priority_issues: 0,
      },
      recommendations: [],
      trends: {
        improving: [],
        worsening: [],
        stable: [],
      },
      next_review_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      generated_at: new Date().toISOString(),
    };
  }

  /**
   * Default embedded prompt
   */
  private getDefaultPrompt(): string {
    return `You are a feedback agent that analyzes validation patterns and suggests improvements.`;
  }
}
