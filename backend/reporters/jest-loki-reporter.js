/**
 * jest-loki-reporter.js
 * Custom Jest reporter — scrive un file NDJSON in scripts/logs/
 * pronto per essere pushato a Loki da push-test-logs.sh
 *
 * Attivazione in package.json:
 *   "reporters": ["default", "./reporters/jest-loki-reporter.js"]
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '../../scripts/logs');

class JestLokiReporter {
  constructor(_globalConfig, _options) {
    this._startTime = Date.now();
  }

  onRunComplete(_contexts, results) {
    const ts       = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile  = path.join(LOG_DIR, `test-backend-${ts}.ndjson`);
    const runId    = `backend-${Date.now()}`;
    const lines    = [];

    // ── riga di sommario esecuzione ────────────────────────────────────────
    lines.push(JSON.stringify({
      timestamp:    new Date().toISOString(),
      level:        results.numFailedTests > 0 ? 'error' : 'info',
      job:          'test-results',
      app:          'backend',
      run_id:       runId,
      type:         'summary',
      total:        results.numTotalTests,
      passed:       results.numPassedTests,
      failed:       results.numFailedTests,
      skipped:      results.numPendingTests,
      duration_ms:  Date.now() - this._startTime,
      status:       results.numFailedTests > 0 ? 'failed' : 'passed',
      message:      `Test run ${results.numFailedTests > 0 ? 'FALLITO' : 'OK'}: ${results.numPassedTests}✓ ${results.numFailedTests}✗ su ${results.numTotalTests}`,
    }));

    // ── una riga per ogni suite ────────────────────────────────────────────
    for (const suite of results.testResults) {
      const suiteName = path.relative(process.cwd(), suite.testFilePath);

      for (const test of suite.testResults) {
        lines.push(JSON.stringify({
          timestamp:  new Date(suite.perfStats.start + (test.duration ?? 0)).toISOString(),
          level:      test.status === 'failed' ? 'error' : test.status === 'pending' ? 'warn' : 'info',
          job:        'test-results',
          app:        'backend',
          run_id:     runId,
          type:       'test',
          suite:      suiteName,
          test:       test.fullName,
          status:     test.status,
          duration_ms: test.duration ?? 0,
          message:    `[${test.status.toUpperCase()}] ${test.fullName} (${test.duration ?? 0}ms)`,
          error:      test.failureMessages?.join('\n') ?? null,
        }));
      }
    }

    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
    console.log(`\n[LokiReporter] Log scritto: ${outFile}`);
  }
}

module.exports = JestLokiReporter;
