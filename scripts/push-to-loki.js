#!/usr/bin/env node
/**
 * push-to-loki.js — invia i log NDJSON dei test a Loki via HTTP
 *
 * Richiede: kubectl port-forward -n observability svc/loki 13100:3100
 * Usage:    node scripts/push-to-loki.js [--url http://localhost:13100] [--file path.ndjson]
 */

const fs   = require('fs');
const path = require('path');
const http = require('http');

// ── config ────────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const urlArg  = args[args.indexOf('--url')  + 1] || 'http://localhost:13100';
const fileArg = args[args.indexOf('--file') + 1] || null;
const LOG_DIR = path.join(__dirname, 'logs');

// ── push singola stream a Loki ────────────────────────────────────────────────
function pushToLoki(lokiUrl, payload) {
  return new Promise((resolve, reject) => {
    const body   = JSON.stringify(payload);
    const parsed = new URL(`${lokiUrl}/loki/api/v1/push`);

    const req = http.request({
      hostname: parsed.hostname,
      port:     parsed.port || 3100,
      path:     parsed.pathname,
      method:   'POST',
      headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, (res) => {
      res.resume();
      if (res.statusCode === 204) resolve(true);
      else reject(new Error(`HTTP ${res.statusCode}`));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── processa un file NDJSON ───────────────────────────────────────────────────
async function processFile(filePath, lokiUrl) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines   = content.split('\n').filter(l => l.trim());

  console.log(`\n→ ${path.basename(filePath)} (${lines.length} righe)`);

  let ok = 0, err = 0;

  for (const line of lines) {
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }

    // converti timestamp ISO → nanosecondi Unix
    let tsNs;
    try {
      tsNs = String(BigInt(Math.floor(new Date(entry.timestamp).getTime() * 1e6)));
    } catch {
      tsNs = String(BigInt(Date.now()) * 1000000n);
    }

    const payload = {
      streams: [{
        stream: {
          job:    entry.job    || 'test-results',
          app:    entry.app    || 'unknown',
          status: entry.status || 'unknown',
          level:  entry.level  || 'info',
          type:   entry.type   || 'test',
          source: 'test-runner',
        },
        values: [[tsNs, line]],
      }],
    };

    try {
      await pushToLoki(lokiUrl, payload);
      ok++;
    } catch (e) {
      err++;
      if (err <= 3) console.error(`  ✗ errore: ${e.message}`);
    }
  }

  console.log(`  ✓ ${ok} righe inviate, ${err} errori`);
  return { ok, err };
}

// ── main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Loki URL: ${urlArg}`);

  // verifica connessione
  try {
    await new Promise((resolve, reject) => {
      const req = http.get(`${urlArg}/ready`, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          if (body.trim() === 'ready') resolve();
          else reject(new Error(`Loki non pronto: ${body}`));
        });
      });
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('timeout')));
    });
    console.log('✓ Loki raggiungibile\n');
  } catch (e) {
    console.error(`✗ Loki non raggiungibile su ${urlArg}: ${e.message}`);
    console.error('  Assicurati che il port-forward sia attivo:');
    console.error('  kubectl port-forward -n observability svc/loki 13100:3100');
    process.exit(1);
  }

  // seleziona file
  let files = [];
  if (fileArg) {
    files = [fileArg];
  } else {
    files = fs.readdirSync(LOG_DIR)
      .filter(f => f.startsWith('test-') && f.endsWith('.ndjson'))
      .map(f => path.join(LOG_DIR, f))
      .sort();
  }

  if (files.length === 0) {
    console.error(`Nessun file test-*.ndjson trovato in ${LOG_DIR}`);
    console.error('Esegui prima: npm test (in backend/) oppure ng test (in frontend/)');
    process.exit(1);
  }

  console.log(`File da pushare: ${files.length}`);

  let totalOk = 0, totalErr = 0;
  for (const f of files) {
    const { ok, err } = await processFile(f, urlArg);
    totalOk  += ok;
    totalErr += err;
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Totale: ${totalOk} righe inviate, ${totalErr} errori`);
  console.log('\nCome vedere i risultati su Grafana:');
  console.log('  1. Apri Grafana → Explore → datasource: Loki');
  console.log('  2. Label filter: job = test-results');
  console.log('  3. Oppure LogQL: {job="test-results"} | json');
}

main().catch(e => { console.error(e); process.exit(1); });
