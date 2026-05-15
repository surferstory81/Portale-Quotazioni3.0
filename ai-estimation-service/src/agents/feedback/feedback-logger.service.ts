import { Injectable, Logger } from '@nestjs/common';
import { FeedbackAnalysis } from './feedback.service';
import * as fs from 'fs';
import * as path from 'path';

export interface FeedbackLogEntry {
  timestamp: string;
  analysis_period: string;
  health_score: number;
  recommendations_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  recommendations: FeedbackAnalysis['recommendations'];
  applied_fixes?: Array<{
    recommendation_id: number;
    applied_at: string;
    applied_by: string;
    file_modified: string;
    change_summary: string;
    validation_result?: string;
  }>;
}

@Injectable()
export class FeedbackLoggerService {
  private readonly logger = new Logger(FeedbackLoggerService.name);
  private readonly logsDir: string;

  constructor() {
    this.logsDir = path.join(process.cwd(), 'logs', 'feedback');
    this.ensureLogDirectoryExists();
  }

  /**
   * Log feedback analysis to JSON file
   */
  logAnalysisToJSON(analysis: FeedbackAnalysis): string {
    const timestamp = new Date().toISOString();
    const filename = `feedback-${timestamp.split('T')[0]}.json`;
    const filepath = path.join(this.logsDir, filename);

    const logEntry: FeedbackLogEntry = {
      timestamp,
      analysis_period: analysis.analysis_period,
      health_score: analysis.health_score,
      recommendations_count: analysis.recommendations.length,
      critical_count: analysis.summary.critical_issues,
      high_count: analysis.summary.high_priority_issues,
      medium_count: analysis.summary.medium_priority_issues,
      low_count: analysis.summary.low_priority_issues,
      recommendations: analysis.recommendations,
      applied_fixes: [],
    };

    // Append to existing file or create new
    let existingData: FeedbackLogEntry[] = [];
    if (fs.existsSync(filepath)) {
      try {
        existingData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        if (!Array.isArray(existingData)) {
          existingData = [existingData];
        }
      } catch (error) {
        this.logger.warn(`Failed to read existing log file: ${error.message}`);
        existingData = [];
      }
    }

    existingData.push(logEntry);

    fs.writeFileSync(filepath, JSON.stringify(existingData, null, 2), 'utf-8');

    this.logger.log(`[FEEDBACK-LOGGER] Analysis logged to ${filepath}`);
    return filepath;
  }

  /**
   * Log feedback analysis to HTML file (human-readable report)
   */
  logAnalysisToHTML(analysis: FeedbackAnalysis): string {
    const timestamp = new Date().toISOString();
    const filename = `feedback-${timestamp.split('T')[0]}.html`;
    const filepath = path.join(this.logsDir, filename);

    const html = this.generateHTMLReport(analysis, timestamp);
    fs.writeFileSync(filepath, html, 'utf-8');

    this.logger.log(`[FEEDBACK-LOGGER] HTML report generated at ${filepath}`);
    return filepath;
  }

  /**
   * Log applied fix (when admin applies a recommendation)
   */
  logAppliedFix(
    date: string,
    recommendationIndex: number,
    appliedBy: string,
    fileModified: string,
    changeSummary: string,
    validationResult?: string,
  ): void {
    const jsonFile = path.join(this.logsDir, `feedback-${date}.json`);

    if (!fs.existsSync(jsonFile)) {
      this.logger.warn(`Cannot log applied fix: ${jsonFile} not found`);
      return;
    }

    try {
      const data: FeedbackLogEntry[] = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));

      // Find the latest entry and add applied fix
      if (data.length > 0) {
        const latestEntry = data[data.length - 1];
        if (!latestEntry.applied_fixes) {
          latestEntry.applied_fixes = [];
        }

        latestEntry.applied_fixes.push({
          recommendation_id: recommendationIndex,
          applied_at: new Date().toISOString(),
          applied_by: appliedBy,
          file_modified: fileModified,
          change_summary: changeSummary,
          validation_result: validationResult,
        });

        fs.writeFileSync(jsonFile, JSON.stringify(data, null, 2), 'utf-8');
        this.logger.log(`[FEEDBACK-LOGGER] Applied fix logged for recommendation #${recommendationIndex}`);
      }
    } catch (error) {
      this.logger.error(`Failed to log applied fix: ${error.message}`);
    }
  }

  /**
   * Get all feedback logs (JSON)
   */
  getAllLogs(): Array<{ date: string; filepath: string; entries: FeedbackLogEntry[] }> {
    const files = fs.readdirSync(this.logsDir)
      .filter(f => f.startsWith('feedback-') && f.endsWith('.json'))
      .sort()
      .reverse();

    return files.map(file => {
      const filepath = path.join(this.logsDir, file);
      const entries = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      return {
        date: file.replace('feedback-', '').replace('.json', ''),
        filepath,
        entries: Array.isArray(entries) ? entries : [entries],
      };
    });
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(analysis: FeedbackAnalysis, timestamp: string): string {
    const criticalRecs = analysis.recommendations.filter(r => r.priority === 'CRITICAL');
    const highRecs = analysis.recommendations.filter(r => r.priority === 'HIGH');
    const mediumRecs = analysis.recommendations.filter(r => r.priority === 'MEDIUM');
    const lowRecs = analysis.recommendations.filter(r => r.priority === 'LOW');

    return `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback Analysis Report - ${timestamp.split('T')[0]}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #f5f5f5;
      padding: 20px;
      color: #333;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 40px;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .health-score {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px;
      margin-bottom: 30px;
      text-align: center;
    }
    .health-score h2 {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .health-score p {
      font-size: 18px;
      opacity: 0.9;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #ddd;
    }
    .summary-card.critical { border-left-color: #e74c3c; }
    .summary-card.high { border-left-color: #e67e22; }
    .summary-card.medium { border-left-color: #f39c12; }
    .summary-card.low { border-left-color: #3498db; }
    .summary-card h3 {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .summary-card .number {
      font-size: 32px;
      font-weight: bold;
      color: #2c3e50;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #2c3e50;
      border-bottom: 2px solid #ecf0f1;
      padding-bottom: 10px;
    }
    .recommendation {
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
      border-left: 4px solid #ddd;
    }
    .recommendation.critical { border-left-color: #e74c3c; }
    .recommendation.high { border-left-color: #e67e22; }
    .recommendation.medium { border-left-color: #f39c12; }
    .recommendation.low { border-left-color: #3498db; }
    .rec-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }
    .rec-priority {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .rec-priority.critical { background: #e74c3c; color: white; }
    .rec-priority.high { background: #e67e22; color: white; }
    .rec-priority.medium { background: #f39c12; color: white; }
    .rec-priority.low { background: #3498db; color: white; }
    .rec-category {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      background: #ecf0f1;
      color: #7f8c8d;
      margin-left: 10px;
    }
    .rec-content h3 {
      font-size: 18px;
      color: #2c3e50;
      margin-bottom: 10px;
    }
    .rec-section {
      margin: 15px 0;
    }
    .rec-section-title {
      font-weight: bold;
      color: #7f8c8d;
      font-size: 13px;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .rec-text {
      color: #555;
      line-height: 1.6;
    }
    .code-block {
      background: #2c3e50;
      color: #ecf0f1;
      padding: 15px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      overflow-x: auto;
      margin: 10px 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    .file-badge {
      background: #3498db;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-family: 'Courier New', monospace;
      display: inline-block;
      margin: 5px 0;
    }
    .action-badge {
      background: #2ecc71;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      display: inline-block;
      margin-left: 10px;
    }
    .impact-badge {
      background: #e67e22;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      display: inline-block;
    }
    .trends {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .trend-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
    }
    .trend-card h3 {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 10px;
    }
    .trend-card ul {
      list-style: none;
    }
    .trend-card li {
      padding: 5px 0;
      color: #555;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ecf0f1;
      text-align: center;
      color: #7f8c8d;
      font-size: 14px;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 AI Feedback Analysis Report</h1>
    <p class="subtitle">
      Generated: ${new Date(timestamp).toLocaleString('it-IT')}<br>
      Analysis Period: ${analysis.analysis_period}
    </p>

    <div class="health-score">
      <h2>${analysis.health_score}/100</h2>
      <p>System Health Score</p>
    </div>

    <div class="summary-grid">
      <div class="summary-card critical">
        <h3>Critical Issues</h3>
        <div class="number">${analysis.summary.critical_issues}</div>
      </div>
      <div class="summary-card high">
        <h3>High Priority</h3>
        <div class="number">${analysis.summary.high_priority_issues}</div>
      </div>
      <div class="summary-card medium">
        <h3>Medium Priority</h3>
        <div class="number">${analysis.summary.medium_priority_issues}</div>
      </div>
      <div class="summary-card low">
        <h3>Low Priority</h3>
        <div class="number">${analysis.summary.low_priority_issues}</div>
      </div>
    </div>

    ${criticalRecs.length > 0 ? `
    <div class="section">
      <h2>🚨 Critical Recommendations</h2>
      ${criticalRecs.map((rec, idx) => this.renderRecommendation(rec, idx)).join('')}
    </div>
    ` : ''}

    ${highRecs.length > 0 ? `
    <div class="section">
      <h2>⚠️ High Priority Recommendations</h2>
      ${highRecs.map((rec, idx) => this.renderRecommendation(rec, idx)).join('')}
    </div>
    ` : ''}

    ${mediumRecs.length > 0 ? `
    <div class="section">
      <h2>💡 Medium Priority Recommendations</h2>
      ${mediumRecs.map((rec, idx) => this.renderRecommendation(rec, idx)).join('')}
    </div>
    ` : ''}

    ${lowRecs.length > 0 ? `
    <div class="section">
      <h2>📊 Low Priority Recommendations</h2>
      ${lowRecs.map((rec, idx) => this.renderRecommendation(rec, idx)).join('')}
    </div>
    ` : ''}

    <div class="section">
      <h2>📈 Trends</h2>
      <div class="trends">
        <div class="trend-card">
          <h3>✅ Improving</h3>
          <ul>
            ${analysis.trends.improving.length > 0
              ? analysis.trends.improving.map(t => `<li>${t}</li>`).join('')
              : '<li><em>No trends detected</em></li>'}
          </ul>
        </div>
        <div class="trend-card">
          <h3>⚠️ Worsening</h3>
          <ul>
            ${analysis.trends.worsening.length > 0
              ? analysis.trends.worsening.map(t => `<li>${t}</li>`).join('')
              : '<li><em>No trends detected</em></li>'}
          </ul>
        </div>
        <div class="trend-card">
          <h3>➡️ Stable</h3>
          <ul>
            ${analysis.trends.stable.length > 0
              ? analysis.trends.stable.map(t => `<li>${t}</li>`).join('')
              : '<li><em>No trends detected</em></li>'}
          </ul>
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Next review recommended: ${analysis.next_review_date}</p>
      <p>Portale Quotazioni 3.0 - AI Feedback Agent v1.0</p>
    </div>
  </div>
</body>
</html>`;
  }

  private renderRecommendation(rec: any, idx: number): string {
    const priorityClass = rec.priority.toLowerCase();
    return `
      <div class="recommendation ${priorityClass}">
        <div class="rec-header">
          <div>
            <span class="rec-priority ${priorityClass}">${rec.priority}</span>
            <span class="rec-category">${rec.category}</span>
            <span class="impact-badge">${rec.affected_estimations_pct}% affected</span>
          </div>
        </div>
        <div class="rec-content">
          <h3>Issue Pattern</h3>
          <p class="rec-text">${rec.issue_pattern}</p>

          <div class="rec-section">
            <div class="rec-section-title">Root Cause</div>
            <p class="rec-text">${rec.root_cause}</p>
          </div>

          <div class="rec-section">
            <div class="rec-section-title">Specific Fix</div>
            <span class="file-badge">${rec.specific_fix.file}</span>
            <span class="action-badge">${rec.specific_fix.action}</span>
            <p class="rec-text" style="margin-top: 10px;"><strong>Location:</strong> ${rec.specific_fix.location}</p>
            <div class="code-block">${this.escapeHTML(rec.specific_fix.content)}</div>
          </div>

          ${rec.alternative_fix ? `
          <div class="rec-section">
            <div class="rec-section-title">Alternative Fix</div>
            <span class="file-badge">${rec.alternative_fix.file}</span>
            <span class="action-badge">${rec.alternative_fix.action}</span>
            <p class="rec-text" style="margin-top: 10px;"><strong>Location:</strong> ${rec.alternative_fix.location}</p>
            <div class="code-block">${this.escapeHTML(rec.alternative_fix.content)}</div>
          </div>
          ` : ''}

          <div class="rec-section">
            <div class="rec-section-title">Validation Test</div>
            <p class="rec-text">${rec.validation_test}</p>
          </div>
        </div>
      </div>
    `;
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private ensureLogDirectoryExists(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
      this.logger.log(`[FEEDBACK-LOGGER] Created logs directory: ${this.logsDir}`);
    }
  }
}
