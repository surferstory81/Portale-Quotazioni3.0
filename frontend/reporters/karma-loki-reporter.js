/**
 * karma-loki-reporter.js
 * Custom Karma reporter — scrive NDJSON in scripts/logs/
 *
 * Registrazione in karma.conf.js:
 *   plugins: [..., require('./reporters/karma-loki-reporter')],
 *   reporters: [..., 'loki'],
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const LOG_DIR = path.resolve(__dirname, '../../scripts/logs');

function KarmaLokiReporter(config, logger) {
  const log     = logger.create('reporter.loki');
  const lines   = [];
  const runId   = `frontend-${Date.now()}`;
  const start   = Date.now();
  let total = 0, passed = 0, failed = 0, skipped = 0;

  this.onSpecComplete = (_browser, result) => {
    total++;
    const status = result.skipped ? 'skipped' : result.success ? 'passed' : 'failed';
    if (result.success)       passed++;
    else if (result.skipped)  skipped++;
    else                      failed++;

    lines.push(JSON.stringify({
      timestamp:   new Date().toISOString(),
      level:       result.success ? 'info' : result.skipped ? 'warn' : 'error',
      job:         'test-results',
      app:         'frontend',
      run_id:      runId,
      type:        'test',
      suite:       result.suite?.join(' > ') ?? '',
      test:        result.description,
      status,
      duration_ms: result.time ?? 0,
      message:     `[${status.toUpperCase()}] ${result.suite?.join(' > ')} > ${result.description}`,
      error:       result.log?.join('\n') ?? null,
    }));
  };

  this.onRunComplete = () => {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outFile = path.join(LOG_DIR, `test-frontend-${ts}.ndjson`);

    lines.unshift(JSON.stringify({
      timestamp:   new Date().toISOString(),
      level:       failed > 0 ? 'error' : 'info',
      job:         'test-results',
      app:         'frontend',
      run_id:      runId,
      type:        'summary',
      total, passed, failed, skipped,
      duration_ms: Date.now() - start,
      status:      failed > 0 ? 'failed' : 'passed',
      message:     `Test run ${failed > 0 ? 'FALLITO' : 'OK'}: ${passed}✓ ${failed}✗ su ${total}`,
    }));

    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.writeFileSync(outFile, lines.join('\n') + '\n', 'utf8');
    log.info(`Log scritto: ${outFile}`);
  };
}

KarmaLokiReporter.$inject = ['config', 'logger'];

module.exports = { 'reporter:loki': ['type', KarmaLokiReporter] };
