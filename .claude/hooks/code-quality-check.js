#!/usr/bin/env node
/**
 * Pre-Commit Hook: Code Quality Check
 *
 * Verifica qualità del codice:
 * - Complexity eccessiva (function troppo lunghe)
 * - Duplicazione codice
 * - Magic numbers
 * - Console.log dimenticati
 * - TODOs/FIXMEs senza issue tracking
 * - Commenti inutili o obsoleti
 * - Naming conventions
 */

const { execSync } = require('child_process');
const fs = require('fs');

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

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf-8' });
    return output.trim().split('\n').filter(f => f && (f.endsWith('.ts') || f.endsWith('.js')));
  } catch (error) {
    return [];
  }
}

const qualityChecks = [
  {
    name: 'Function Length',
    check: (content, file) => {
      const issues = [];
      const functionRegex = /(?:function|async\s+function|\w+\s*\([^)]*\)\s*{|\w+\s*=\s*\([^)]*\)\s*=>)/g;
      const matches = content.matchAll(functionRegex);

      for (const match of matches) {
        const startIdx = match.index;
        let braceCount = 1;
        let endIdx = startIdx;
        let inFunction = false;

        for (let i = startIdx; i < content.length; i++) {
          if (content[i] === '{') {
            if (!inFunction) {
              inFunction = true;
              continue;
            }
            braceCount++;
          }
          if (content[i] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endIdx = i;
              break;
            }
          }
        }

        const functionBody = content.substring(startIdx, endIdx);
        const lines = functionBody.split('\n').length;

        if (lines > 50) {
          const funcName = match[0].match(/\w+/)?.[0] || 'anonymous';
          issues.push({
            file,
            severity: 'warning',
            message: `Function '${funcName}' is ${lines} lines long (max 50)`,
            suggestion: 'Extract smaller functions or refactor logic',
            line: content.substring(0, startIdx).split('\n').length,
          });
        }
      }
      return issues;
    },
  },

  {
    name: 'Magic Numbers',
    check: (content, file) => {
      const issues = [];
      // Ignora numeri comuni (0, 1, -1, 100, 1000) e timeout
      const magicNumberRegex = /(?<![a-zA-Z_])\b(?!0\b|1\b|-1\b|100\b|1000\b|3000\b|5000\b|60000\b|120000\b)\d{2,}\b(?!\s*\/\/)/g;
      const matches = content.matchAll(magicNumberRegex);

      for (const match of matches) {
        const number = match[0];
        const line = content.substring(0, match.index).split('\n').length;
        const context = content.substring(Math.max(0, match.index - 50), match.index + 50);

        // Skip se è in un commento o costante
        if (context.includes('const ') || context.includes('//') || context.includes('/*')) {
          continue;
        }

        issues.push({
          file,
          severity: 'warning',
          message: `Magic number '${number}' found`,
          suggestion: 'Extract to named constant: const MAX_RETRY_COUNT = ${number}',
          line,
        });
      }
      return issues;
    },
  },

  {
    name: 'Console Logs',
    check: (content, file) => {
      const issues = [];
      const consoleRegex = /console\.(log|debug|info|warn|error)\s*\(/g;
      const matches = content.matchAll(consoleRegex);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        const context = content.substring(match.index, match.index + 100);

        // Ignora se c'è commento esplicito che giustifica
        if (!context.includes('// debug') && !context.includes('// temporary')) {
          issues.push({
            file,
            severity: 'warning',
            message: `console.${match[1]}() found - use Logger instead`,
            suggestion: 'Use this.logger.log() or remove debug statement',
            line,
          });
        }
      }
      return issues;
    },
  },

  {
    name: 'TODO/FIXME Without Issue',
    check: (content, file) => {
      const issues = [];
      const todoRegex = /\/\/\s*(TODO|FIXME)(?!.*#\d+)(?!.*http)/gi;
      const matches = content.matchAll(todoRegex);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.push({
          file,
          severity: 'info',
          message: `${match[1]} without issue reference`,
          suggestion: 'Link to issue: // TODO(#123) or remove if resolved',
          line,
        });
      }
      return issues;
    },
  },

  {
    name: 'Commented Code',
    check: (content, file) => {
      const issues = [];
      const lines = content.split('\n');

      let commentedCodeBlock = [];
      let blockStart = 0;

      lines.forEach((line, idx) => {
        const trimmed = line.trim();

        if (trimmed.startsWith('//') && /[{};()\[\]]/.test(trimmed)) {
          if (commentedCodeBlock.length === 0) {
            blockStart = idx + 1;
          }
          commentedCodeBlock.push(trimmed);
        } else if (commentedCodeBlock.length > 0) {
          if (commentedCodeBlock.length >= 3) {
            issues.push({
              file,
              severity: 'warning',
              message: `${commentedCodeBlock.length} lines of commented code found`,
              suggestion: 'Remove commented code - use git history instead',
              line: blockStart,
            });
          }
          commentedCodeBlock = [];
        }
      });

      return issues;
    },
  },

  {
    name: 'Useless Comments',
    check: (content, file) => {
      const issues = [];
      // Commenti che ripetono il codice
      const uselessPatterns = [
        { pattern: /\/\/\s*constructor/i, message: 'Useless constructor comment' },
        { pattern: /\/\/\s*getter/i, message: 'Useless getter comment' },
        { pattern: /\/\/\s*setter/i, message: 'Useless setter comment' },
        { pattern: /\/\/\s*return/i, message: 'Useless return comment' },
      ];

      uselessPatterns.forEach(({ pattern, message }) => {
        const matches = content.matchAll(new RegExp(pattern, 'g'));
        for (const match of matches) {
          const line = content.substring(0, match.index).split('\n').length;
          issues.push({
            file,
            severity: 'info',
            message,
            suggestion: 'Remove comment - code is self-explanatory',
            line,
          });
        }
      });

      return issues;
    },
  },

  {
    name: 'Naming Conventions',
    check: (content, file) => {
      const issues = [];

      // Classes should be PascalCase
      const classRegex = /class\s+([a-z][a-zA-Z0-9]*)/g;
      const classMatches = content.matchAll(classRegex);
      for (const match of classMatches) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.push({
          file,
          severity: 'error',
          message: `Class name '${match[1]}' should be PascalCase`,
          suggestion: `Rename to '${match[1].charAt(0).toUpperCase() + match[1].slice(1)}'`,
          line,
        });
      }

      // Constants should be UPPER_SNAKE_CASE
      const constantRegex = /const\s+([a-z][a-zA-Z0-9]*)\s*=\s*(?:['"`\d]|\[|\{)/g;
      const constantMatches = content.matchAll(constantRegex);
      for (const match of constantMatches) {
        const varName = match[1];
        // Skip se è in camelCase (variabili normali)
        if (varName === varName.toLowerCase() || /[A-Z]/.test(varName)) {
          continue;
        }

        const line = content.substring(0, match.index).split('\n').length;
        const context = content.substring(match.index, match.index + 100);

        // Verifica se sembra una costante (primitivo, object literal, array literal)
        if (context.match(/=\s*(?:['"`]|true|false|\d+|\[|\{)/)) {
          const upperSnake = varName.replace(/([A-Z])/g, '_$1').toUpperCase();
          issues.push({
            file,
            severity: 'info',
            message: `Constant '${varName}' should be UPPER_SNAKE_CASE`,
            suggestion: `Rename to '${upperSnake}'`,
            line,
          });
        }
      }

      return issues;
    },
  },

  {
    name: 'Nested Callbacks',
    check: (content, file) => {
      const issues = [];
      const callbackRegex = /\)\s*=>\s*\{[^}]*\)\s*=>\s*\{[^}]*\)\s*=>\s*\{/g;
      const matches = content.matchAll(callbackRegex);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.push({
          file,
          severity: 'warning',
          message: 'Deeply nested callbacks (callback hell)',
          suggestion: 'Refactor to async/await or extract functions',
          line,
        });
      }
      return issues;
    },
  },

  {
    name: 'Unused Imports',
    check: (content, file) => {
      const issues = [];
      const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
      const imports = content.matchAll(importRegex);

      for (const match of imports) {
        const importedItems = match[1].split(',').map(i => i.trim());
        const restOfFile = content.substring(match.index + match[0].length);

        importedItems.forEach(item => {
          const itemName = item.split(' as ')[1] || item;
          // Check if item is used in rest of file
          const usageRegex = new RegExp(`\\b${itemName}\\b`, 'g');
          const usages = restOfFile.match(usageRegex);

          if (!usages || usages.length === 0) {
            const line = content.substring(0, match.index).split('\n').length;
            issues.push({
              file,
              severity: 'info',
              message: `Unused import: ${itemName}`,
              suggestion: 'Remove unused import',
              line,
            });
          }
        });
      }
      return issues;
    },
  },

  {
    name: 'TypeScript Any Type',
    check: (content, file) => {
      const issues = [];
      const anyRegex = /:\s*any\b(?!\[\])/g;
      const matches = content.matchAll(anyRegex);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        const context = content.substring(Math.max(0, match.index - 50), match.index + 50);

        // Skip se è in commento o è any[] (array di any può essere accettabile temporaneamente)
        if (context.includes('//') || context.includes('/*')) {
          continue;
        }

        issues.push({
          file,
          severity: 'warning',
          message: 'Type "any" found - reduces type safety',
          suggestion: 'Use explicit type, unknown, or generic <T>',
          line,
        });
      }
      return issues;
    },
  },

  {
    name: 'N+1 Query Pattern',
    check: (content, file) => {
      const issues = [];
      // Cerca pattern: for/forEach con await query inside
      const n1Pattern = /(?:for|forEach)\s*\([^)]*\)\s*\{[^}]*await\s+(?:this\.)?\w+\.(?:find|findOne|get|query)/gs;
      const matches = content.matchAll(n1Pattern);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.push({
          file,
          severity: 'error',
          message: 'Possible N+1 query pattern detected',
          suggestion: 'Use single query with WHERE IN or JOIN instead of loop with individual queries',
          line,
        });
      }
      return issues;
    },
  },

  {
    name: 'Missing Async Pipe',
    check: (content, file) => {
      const issues = [];
      // Solo per file Angular template
      if (!file.includes('.component.ts')) return issues;

      const subscribePattern = /\.subscribe\s*\(/g;
      const matches = content.matchAll(subscribePattern);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        const context = content.substring(match.index, match.index + 200);

        // Se non c'è unsubscribe visibile nel context
        if (!context.includes('unsubscribe') && !context.includes('takeUntil') && !context.includes('takeWhile')) {
          issues.push({
            file,
            severity: 'warning',
            message: 'Manual subscription without unsubscribe - memory leak risk',
            suggestion: 'Use async pipe in template or add takeUntil/unsubscribe in ngOnDestroy',
            line,
          });
        }
      }
      return issues;
    },
  },

  {
    name: 'Large Bundle Imports',
    check: (content, file) => {
      const issues = [];
      // Import di librerie intere
      const largeImportPattern = /import\s+\*\s+as\s+\w+\s+from\s+['"](?:lodash|moment|rxjs)['"]/g;
      const matches = content.matchAll(largeImportPattern);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        const library = match[0].match(/from\s+['"](.*)['"]/)[1];

        issues.push({
          file,
          severity: 'warning',
          message: `Importing entire ${library} library increases bundle size`,
          suggestion: `Import only needed functions: import debounce from '${library}/debounce'`,
          line,
        });
      }
      return issues;
    },
  },

  {
    name: 'Missing TrackBy in NgFor',
    check: (content, file) => {
      const issues = [];
      // Solo per file Angular HTML
      if (!file.endsWith('.component.html') && !file.endsWith('.component.ts')) return issues;

      const ngForPattern = /\*ngFor="[^"]*"(?!.*trackBy)/g;
      const matches = content.matchAll(ngForPattern);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.push({
          file,
          severity: 'warning',
          message: '*ngFor without trackBy function - performance issue for large lists',
          suggestion: 'Add trackBy: "let item of items; trackBy: trackById"',
          line,
        });
      }
      return issues;
    },
  },

  {
    name: 'No Tests for New Code',
    check: (content, file) => {
      const issues = [];
      // Skip test files themselves
      if (file.includes('.spec.') || file.includes('.test.')) return issues;

      // Se è un service/component senza test corrispondente
      if (file.includes('.service.ts') || file.includes('.component.ts')) {
        const fs = require('fs');
        const testFile = file.replace(/\.ts$/, '.spec.ts');

        if (!fs.existsSync(testFile)) {
          issues.push({
            file,
            severity: 'warning',
            message: 'No corresponding test file found',
            suggestion: `Create ${testFile} with unit tests`,
            line: 1,
          });
        }
      }
      return issues;
    },
  },

  {
    name: 'Injectable Without Scope',
    check: (content, file) => {
      const issues = [];
      // Solo per file service NestJS/Angular
      if (!file.includes('.service.ts')) return issues;

      const injectablePattern = /@Injectable\(\s*\)/g;
      const matches = content.matchAll(injectablePattern);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        const nextChars = content.substring(match.index, match.index + 100);

        // Se non specifica providedIn (Angular) o scope (NestJS)
        if (!nextChars.includes('providedIn') && !nextChars.includes('scope')) {
          issues.push({
            file,
            severity: 'info',
            message: '@Injectable() without scope specification',
            suggestion: "Add providedIn: 'root' for tree-shakeable provider",
            line,
          });
        }
      }
      return issues;
    },
  },

  {
    name: 'DTO Missing Validation',
    check: (content, file) => {
      const issues = [];
      // Solo per DTO files
      if (!file.includes('.dto.ts')) return issues;

      const classPattern = /export\s+class\s+\w+/g;
      const matches = content.matchAll(classPattern);

      for (const match of matches) {
        const classStart = match.index;
        // Check se ci sono decorator class-validator nei prossimi 500 caratteri
        const classBody = content.substring(classStart, classStart + 500);

        const hasValidation = /(@IsString|@IsNumber|@IsEnum|@IsOptional|@IsNotEmpty)/g.test(classBody);

        if (!hasValidation) {
          const line = content.substring(0, match.index).split('\n').length;
          issues.push({
            file,
            severity: 'error',
            message: 'DTO class without validation decorators',
            suggestion: 'Add class-validator decorators (@IsString, @IsNotEmpty, etc)',
            line,
          });
        }
      }
      return issues;
    },
  },

  {
    name: 'Hardcoded URLs',
    check: (content, file) => {
      const issues = [];
      const urlPattern = /(https?:\/\/(?!example\.com|localhost)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
      const matches = content.matchAll(urlPattern);

      for (const match of matches) {
        const line = content.substring(0, match.index).split('\n').length;
        const context = content.substring(Math.max(0, match.index - 50), match.index);

        // Skip se è in commento o è process.env
        if (context.includes('//') || context.includes('process.env') || context.includes('config')) {
          continue;
        }

        issues.push({
          file,
          severity: 'warning',
          message: `Hardcoded URL found: ${match[1]}`,
          suggestion: 'Move to environment variables or config service',
          line,
        });
      }
      return issues;
    },
  },
];

function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('   CODE QUALITY CHECK', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    log('No files to check', colors.blue);
    return 0;
  }

  log(`Checking ${stagedFiles.length} file(s)...\n`);

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalInfo = 0;

  stagedFiles.forEach(file => {
    if (!fs.existsSync(file)) return;

    const content = fs.readFileSync(file, 'utf-8');
    const allIssues = [];

    qualityChecks.forEach(check => {
      const issues = check.check(content, file);
      allIssues.push(...issues);
    });

    if (allIssues.length > 0) {
      log(`\n📄 ${file}:`, colors.blue);

      allIssues.forEach(issue => {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
        const color = issue.severity === 'error' ? colors.red : issue.severity === 'warning' ? colors.yellow : colors.blue;

        log(`  ${icon} [Line ${issue.line}] ${issue.message}`, color);
        log(`     💡 ${issue.suggestion}`, colors.yellow);

        if (issue.severity === 'error') totalErrors++;
        else if (issue.severity === 'warning') totalWarnings++;
        else totalInfo++;
      });
    }
  });

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('   SUMMARY', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  if (totalErrors > 0) {
    log(`❌ ${totalErrors} error(s) - COMMIT BLOCKED`, colors.red);
    return 1;
  }

  if (totalWarnings > 0) {
    log(`⚠️  ${totalWarnings} warning(s) - review recommended`, colors.yellow);
  }

  if (totalInfo > 0) {
    log(`ℹ️  ${totalInfo} suggestion(s)`, colors.blue);
  }

  if (totalErrors === 0 && totalWarnings === 0 && totalInfo === 0) {
    log('✅ Code quality is excellent!', colors.green);
  }

  return 0;
}

process.exit(main());
