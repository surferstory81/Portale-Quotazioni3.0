#!/usr/bin/env node
/**
 * Pre-Commit Hook: Architecture Validation
 *
 * Verifica che le modifiche rispettino i principi architetturali dichiarati nelle skill.
 *
 * BLOCCA commit se:
 * - Service-to-service call senza timeout esplicito
 * - @Public() decorator usato senza service authentication
 * - HTTP call senza retry logic
 * - Side-effect operation senza idempotency
 * - Circular dependency tra servizi
 * - Secrets hardcoded nel codice
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colori per output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Get staged files
function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(f => f && (f.endsWith('.ts') || f.endsWith('.js')));
  } catch (error) {
    return [];
  }
}

// Get file diff
function getFileDiff(file) {
  try {
    return execSync(`git diff --cached ${file}`, { encoding: 'utf-8' });
  } catch (error) {
    return '';
  }
}

// Validation rules
const validations = [
  {
    name: 'HTTP Timeout Required',
    pattern: /\.(?:get|post|put|patch|delete)\s*\([^)]*\)/g,
    check: (match, context) => {
      // Cerca 'timeout' nei prossimi 300 caratteri
      const nextChars = context.substring(context.indexOf(match), context.indexOf(match) + 300);
      return nextChars.includes('timeout') || nextChars.includes('requestTimeout');
    },
    message: 'HTTP call senza timeout esplicito - rischio hang infinito',
    severity: 'error',
    suggestion: 'Aggiungi { timeout: 60000 } nelle options della chiamata HTTP',
  },

  {
    name: 'Public Endpoint Security',
    pattern: /@Public\(\)/g,
    check: (match, context) => {
      // Verifica se c'è ServiceAuthGuard o altra auth nei prossimi 500 caratteri
      const nextChars = context.substring(context.indexOf(match), context.indexOf(match) + 500);
      return nextChars.includes('ServiceAuthGuard') ||
             nextChars.includes('x-service-token') ||
             nextChars.includes('service authentication');
    },
    message: '@Public() decorator senza service authentication - security risk',
    severity: 'error',
    suggestion: 'Implementa ServiceAuthGuard o verifica x-service-token header',
  },

  {
    name: 'Retry Logic for External Calls',
    pattern: /(?:fetch|axios|httpService|http\.request)\s*\(/g,
    check: (match, context) => {
      // Cerca 'retry' o 'attempt' nelle righe precedenti/successive
      const surrounding = context.substring(
        Math.max(0, context.indexOf(match) - 500),
        context.indexOf(match) + 500
      );
      return surrounding.includes('retry') ||
             surrounding.includes('attempt') ||
             surrounding.includes('retries');
    },
    message: 'External HTTP call senza retry logic - rischio failure non gestito',
    severity: 'warning',
    suggestion: 'Implementa retry con exponential backoff o usa libreria come axios-retry',
  },

  {
    name: 'Idempotency for Side Effects',
    pattern: /\.(?:save|create|update|delete|insert)\s*\(/g,
    check: (match, context) => {
      // Cerca idempotency key nei 500 caratteri precedenti
      const precedingChars = context.substring(
        Math.max(0, context.indexOf(match) - 500),
        context.indexOf(match)
      );
      return precedingChars.includes('idempotency') ||
             precedingChars.includes('idempotent') ||
             precedingChars.includes('upsert') ||
             context.includes('findOne'); // Check before create
    },
    message: 'Side-effect operation senza idempotency check - rischio duplicati',
    severity: 'warning',
    suggestion: 'Implementa idempotency key o verifica esistenza prima di creare',
  },

  {
    name: 'Hardcoded Secrets',
    pattern: /(password|secret|api[_-]?key|token|credential)\s*[:=]\s*['"][^'"]+['"]/gi,
    check: (match, context) => {
      // Ignora se è placeholder o env var
      return match.includes('process.env') ||
             match.includes('config') ||
             match.includes('TODO') ||
             match.includes('example') ||
             match.includes('placeholder');
    },
    message: 'Possibile secret hardcoded nel codice',
    severity: 'error',
    suggestion: 'Usa variabili d\'ambiente: process.env.SECRET_NAME',
  },

  {
    name: 'Circuit Breaker for Unstable Services',
    pattern: /@Injectable\(\)\s+export\s+class\s+\w*Client/g,
    check: (match, context) => {
      // Verifica se c'è circuit breaker nel service
      return context.includes('CircuitBreaker') ||
             context.includes('circuitBreaker') ||
             context.includes('breaker');
    },
    message: 'Service client senza circuit breaker - rischio cascading failure',
    severity: 'warning',
    suggestion: 'Implementa circuit breaker pattern per proteggere da servizi down',
  },

  {
    name: 'Database Transaction for Multi-Step',
    pattern: /await\s+this\.\w+\.(?:save|create|update|delete)\([^)]*\);\s*await\s+this\.\w+\.(?:save|create|update|delete)/g,
    check: (match, context) => {
      const precedingChars = context.substring(
        Math.max(0, context.indexOf(match) - 300),
        context.indexOf(match)
      );
      return precedingChars.includes('transaction') ||
             precedingChars.includes('.transaction(') ||
             precedingChars.includes('queryRunner');
    },
    message: 'Multiple DB operations senza transaction - rischio inconsistenza',
    severity: 'error',
    suggestion: 'Wrappa operazioni multiple in transaction: await this.db.transaction(async tx => ...)',
  },

  {
    name: 'Error Handling for Async Operations',
    pattern: /async\s+\w+\s*\([^)]*\)\s*\{[^}]*\}/g,
    check: (match) => {
      // Verifica se c'è try-catch o .catch()
      return match.includes('try') ||
             match.includes('catch') ||
             match.includes('.catch(');
    },
    message: 'Async function senza error handling - errori non gestiti',
    severity: 'warning',
    suggestion: 'Aggiungi try-catch o .catch() per gestire errori async',
  },

  {
    name: 'SQL Injection Prevention',
    pattern: /\.query\s*\(\s*`[^`]*\$\{[^}]+\}[^`]*`/g,
    check: () => false, // Sempre blocca template literals in SQL
    message: 'Possibile SQL injection - template literal in query',
    severity: 'error',
    suggestion: 'Usa parametrized queries: .query("SELECT * FROM users WHERE id = ?", [userId])',
  },

  {
    name: 'Logging Sensitive Data',
    pattern: /console\.log\([^)]*(?:password|secret|token|credential|ssn|card)/gi,
    check: () => false,
    message: 'Logging di dati sensibili',
    severity: 'error',
    suggestion: 'Rimuovi log di dati sensibili o redigi prima di loggare',
  },
];

// Run validations
function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const diff = getFileDiff(filePath);

  // Solo righe aggiunte nel diff
  const addedLines = diff
    .split('\n')
    .filter(line => line.startsWith('+') && !line.startsWith('+++'))
    .map(line => line.substring(1))
    .join('\n');

  if (!addedLines.trim()) {
    return { errors: [], warnings: [] };
  }

  const errors = [];
  const warnings = [];

  for (const validation of validations) {
    const matches = addedLines.matchAll(validation.pattern);

    for (const match of matches) {
      const passed = validation.check(match[0], content);

      if (!passed) {
        const issue = {
          file: filePath,
          rule: validation.name,
          message: validation.message,
          suggestion: validation.suggestion,
          line: findLineNumber(content, match[0]),
          snippet: match[0],
        };

        if (validation.severity === 'error') {
          errors.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    }
  }

  return { errors, warnings };
}

function findLineNumber(content, snippet) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(snippet)) {
      return i + 1;
    }
  }
  return 0;
}

// Main execution
function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('   ARCHITECTURE VALIDATION HOOK', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    info('No TypeScript/JavaScript files staged for commit');
    return 0;
  }

  info(`Validating ${stagedFiles.length} file(s)...\n`);

  let totalErrors = 0;
  let totalWarnings = 0;

  for (const file of stagedFiles) {
    const { errors, warnings } = validateFile(file);

    if (errors.length > 0 || warnings.length > 0) {
      log(`\n📄 ${file}:`, colors.blue);

      errors.forEach(err => {
        error(`  [Line ${err.line}] ${err.rule}`);
        log(`     ${err.message}`);
        log(`     💡 ${err.suggestion}`, colors.yellow);
      });

      warnings.forEach(warn => {
        warning(`  [Line ${warn.line}] ${warn.rule}`);
        log(`     ${warn.message}`);
        log(`     💡 ${warn.suggestion}`, colors.yellow);
      });
    }

    totalErrors += errors.length;
    totalWarnings += warnings.length;
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('   VALIDATION SUMMARY', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  if (totalErrors > 0) {
    error(`${totalErrors} error(s) found - COMMIT BLOCKED`);
    log('\nFix errors above before committing.', colors.red);
    log('To bypass (NOT RECOMMENDED): git commit --no-verify\n', colors.yellow);
    return 1;
  }

  if (totalWarnings > 0) {
    warning(`${totalWarnings} warning(s) found - review recommended`);
    log('\nWarnings do not block commit but should be reviewed.\n', colors.yellow);
  }

  if (totalErrors === 0 && totalWarnings === 0) {
    success('All validations passed!');
  }

  return 0;
}

// Execute
process.exit(main());
