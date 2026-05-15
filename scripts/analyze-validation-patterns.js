/**
 * Analyze validation issues to identify knowledge gaps and improve estimation agent
 *
 * This script reads validation results from the database and generates a report showing:
 * - Most common HIGH/MEDIUM/LOW issues
 * - Categories with most problems
 * - Patterns that suggest knowledge base gaps
 * - Recommendations for improving estimation agent prompts
 */

const { DataSource } = require('typeorm');
require('dotenv').config({ path: '../backend/.env' });

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function analyzeValidationPatterns() {
  console.log('📊 Analyzing validation patterns for knowledge improvement...\n');

  await dataSource.initialize();

  try {
    // Get all AI estimations with validation data
    const estimations = await dataSource.query(`
      SELECT
        id,
        quotation_id,
        validation_data,
        generated_at,
        ai_status
      FROM ai_estimation
      WHERE validation_data IS NOT NULL
        AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `);

    console.log(`Found ${estimations.length} estimations with validation data (last 30 days)\n`);

    if (estimations.length === 0) {
      console.log('No validation data available yet. Run some estimations first.');
      return;
    }

    // Aggregate issues by severity and category
    const issuesByCategory = new Map();
    const issuesBySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const commonIssueMessages = new Map();
    const validationDecisions = { APPROVE: 0, REVIEW: 0, SENIOR_REVIEW: 0, REJECT: 0 };

    for (const est of estimations) {
      const validation = est.validation_data;

      // Count decisions
      validationDecisions[validation.decision] = (validationDecisions[validation.decision] || 0) + 1;

      // Analyze issues
      if (validation.issues && validation.issues.length > 0) {
        for (const issue of validation.issues) {
          // Count by severity
          issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;

          // Count by category
          const category = issue.category || 'UNKNOWN';
          if (!issuesByCategory.has(category)) {
            issuesByCategory.set(category, { HIGH: 0, MEDIUM: 0, LOW: 0, issues: [] });
          }
          const catData = issuesByCategory.get(category);
          catData[issue.severity]++;
          catData.issues.push({
            severity: issue.severity,
            message: issue.message,
            recommendation: issue.recommendation,
          });

          // Track common issue messages
          const msgKey = `${category}:${issue.severity}:${issue.message.substring(0, 100)}`;
          commonIssueMessages.set(msgKey, (commonIssueMessages.get(msgKey) || 0) + 1);
        }
      }
    }

    // Print report
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                    VALIDATION ANALYSIS REPORT                 ');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📈 VALIDATION DECISIONS (Last 30 days)');
    console.log('─────────────────────────────────────');
    for (const [decision, count] of Object.entries(validationDecisions)) {
      const percentage = ((count / estimations.length) * 100).toFixed(1);
      console.log(`${decision.padEnd(15)} ${count.toString().padStart(4)} (${percentage}%)`);
    }

    console.log('\n🚨 ISSUES BY SEVERITY');
    console.log('─────────────────────────────────────');
    const totalIssues = issuesBySeverity.HIGH + issuesBySeverity.MEDIUM + issuesBySeverity.LOW;
    console.log(`HIGH                ${issuesBySeverity.HIGH.toString().padStart(4)} (${((issuesBySeverity.HIGH / totalIssues) * 100).toFixed(1)}%)`);
    console.log(`MEDIUM              ${issuesBySeverity.MEDIUM.toString().padStart(4)} (${((issuesBySeverity.MEDIUM / totalIssues) * 100).toFixed(1)}%)`);
    console.log(`LOW                 ${issuesBySeverity.LOW.toString().padStart(4)} (${((issuesBySeverity.LOW / totalIssues) * 100).toFixed(1)}%)`);
    console.log(`TOTAL               ${totalIssues.toString().padStart(4)}`);

    console.log('\n📂 ISSUES BY CATEGORY');
    console.log('─────────────────────────────────────');
    const sortedCategories = Array.from(issuesByCategory.entries())
      .sort((a, b) => (b[1].HIGH + b[1].MEDIUM + b[1].LOW) - (a[1].HIGH + a[1].MEDIUM + a[1].LOW));

    for (const [category, data] of sortedCategories) {
      const total = data.HIGH + data.MEDIUM + data.LOW;
      console.log(`\n${category} (${total} issues)`);
      console.log(`  HIGH: ${data.HIGH}, MEDIUM: ${data.MEDIUM}, LOW: ${data.LOW}`);
    }

    console.log('\n🔍 TOP 10 MOST COMMON ISSUES');
    console.log('─────────────────────────────────────');
    const sortedIssues = Array.from(commonIssueMessages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (let i = 0; i < sortedIssues.length; i++) {
      const [msgKey, count] = sortedIssues[i];
      const [category, severity, message] = msgKey.split(':');
      console.log(`\n${i + 1}. [${severity}] ${category}`);
      console.log(`   Count: ${count} (${((count / estimations.length) * 100).toFixed(1)}% of estimations)`);
      console.log(`   Message: ${message}${message.length === 100 ? '...' : ''}`);
    }

    console.log('\n\n💡 RECOMMENDATIONS FOR KNOWLEDGE BASE IMPROVEMENT');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Generate recommendations based on patterns
    const recommendations = generateRecommendations(issuesByCategory, sortedIssues, estimations.length);
    for (let i = 0; i < recommendations.length; i++) {
      console.log(`${i + 1}. ${recommendations[i]}`);
    }

    console.log('\n\n📝 ACTION ITEMS');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Based on this analysis, consider:');
    console.log('');
    console.log('1. Update estimation.prompt.md with clarifications for top issue categories');
    console.log('2. Add missing examples to knowledge base for problematic scenarios');
    console.log('3. Review pricing rules that cause frequent threshold violations');
    console.log('4. Add explicit instructions for edge cases that trigger HIGH issues');
    console.log('5. Create test quotations for scenarios with >20% failure rate');
    console.log('');
    console.log('Run this script monthly to track improvement over time.');
    console.log('');

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

function generateRecommendations(issuesByCategory, topIssues, totalEstimations) {
  const recommendations = [];

  // Check for high-frequency categories
  for (const [category, data] of issuesByCategory.entries()) {
    const total = data.HIGH + data.MEDIUM + data.LOW;
    const percentage = (total / totalEstimations) * 100;

    if (percentage > 30) {
      recommendations.push(
        `**${category}**: Appears in ${percentage.toFixed(0)}% of estimations. ` +
        `Add more examples and validation rules to estimation.prompt.md for this category.`
      );
    }

    if (data.HIGH > 5) {
      recommendations.push(
        `**${category}**: ${data.HIGH} HIGH severity issues detected. ` +
        `Review knowledge base and add explicit calculations/formulas for this area.`
      );
    }
  }

  // Check for common patterns in top issues
  const hasQAIssues = topIssues.some(([key]) => key.toLowerCase().includes('qa'));
  if (hasQAIssues) {
    recommendations.push(
      '**QA Budget**: Frequent QA-related issues detected. ' +
      'Add prominent reminder in estimation.prompt.md about 10% minimum QA budget requirement.'
    );
  }

  const hasMathIssues = topIssues.some(([key]) => key.toLowerCase().includes('sum') || key.toLowerCase().includes('total'));
  if (hasMathIssues) {
    recommendations.push(
      '**Mathematical Accuracy**: Calculation errors detected. ' +
      'Add validation step in estimation.prompt.md to verify all line items sum to totals.'
    );
  }

  const hasThresholdIssues = topIssues.some(([key]) => key.toLowerCase().includes('threshold') || key.toLowerCase().includes('range'));
  if (hasThresholdIssues) {
    recommendations.push(
      '**Threshold Compliance**: Cost-per-unit violations detected. ' +
      'Add reference ranges to knowledge base (e.g., €50-150/vCPU, €20-80/TB).'
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      '**Good Performance**: No major patterns detected. ' +
      'Continue monitoring and refine based on specific HIGH severity issues.'
    );
  }

  return recommendations;
}

// Run analysis
analyzeValidationPatterns()
  .then(() => {
    console.log('✅ Analysis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
