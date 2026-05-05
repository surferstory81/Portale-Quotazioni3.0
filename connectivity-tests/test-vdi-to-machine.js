/**
 * VDI → Macchina Separata Connectivity Test
 *
 * Verifica se VDI può raggiungere la macchina separata via HTTP
 *
 * Usage:
 *   1. Avvia simple server sulla macchina separata:
 *      node simple-http-server.js
 *   2. Esegui questo test da VDI:
 *      node test-vdi-to-machine.js
 */

const http = require('http');
const https = require('https');

// CONFIGURAZIONE - Modificare con IP/hostname della macchina separata
const MACHINE_HOST = process.env.MACHINE_HOST || 'localhost';
const MACHINE_PORT = process.env.MACHINE_PORT || 3001;
const USE_HTTPS = process.env.USE_HTTPS === 'true';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function testHTTPConnection() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('TEST: VDI → Macchina Separata (HTTP)', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const protocol = USE_HTTPS ? 'https' : 'http';
  const client = USE_HTTPS ? https : http;
  const url = `${protocol}://${MACHINE_HOST}:${MACHINE_PORT}/health`;

  logInfo(`Testing connection to: ${url}`);

  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = client.request(url, {
      method: 'GET',
      timeout: 10000,
    }, (res) => {
      const latency = Date.now() - startTime;
      let body = '';

      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        logSuccess('Connection SUCCESS');
        logInfo(`Status Code: ${res.statusCode}`);
        logInfo(`Latency: ${latency}ms`);
        logInfo(`Response: ${body.substring(0, 100)}`);

        resolve({ success: true, statusCode: res.statusCode, latency, body });
      });
    });

    req.on('error', (error) => {
      const latency = Date.now() - startTime;

      logError('Connection FAILED');
      logError(`Error: ${error.message}`);

      if (error.code === 'ENOTFOUND') {
        logError(`Host "${MACHINE_HOST}" non trovato - DNS resolution failed`);
        logInfo('Verifica:');
        logInfo('1. Hostname è corretto');
        logInfo('2. Macchina è raggiungibile dalla rete VDI');
      } else if (error.code === 'ECONNREFUSED') {
        logError('Connection refused - server non in ascolto');
        logInfo('Verifica:');
        logInfo('1. Server è avviato sulla macchina separata');
        logInfo(`2. Server ascolta su porta ${MACHINE_PORT}`);
        logInfo('3. Firewall locale permette traffico in ingresso');
      } else if (error.code === 'ETIMEDOUT') {
        logError('Connection timeout - firewall probabilmente blocca');
        logInfo('Verifica:');
        logInfo('1. Firewall di rete non blocca porta');
        logInfo('2. Macchina è nello stesso segmento rete o routing configurato');
      }

      resolve({ success: false, error: error.message, latency });
    });

    req.on('timeout', () => {
      req.destroy();
      logError('Request timeout after 10s');
      resolve({ success: false, error: 'TIMEOUT' });
    });

    req.end();
  });
}

async function testLatency() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('TEST: Latency Measurement (10 requests)', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const protocol = USE_HTTPS ? 'https' : 'http';
  const client = USE_HTTPS ? https : http;
  const url = `${protocol}://${MACHINE_HOST}:${MACHINE_PORT}/health`;

  const latencies = [];

  for (let i = 1; i <= 10; i++) {
    const startTime = Date.now();

    try {
      await new Promise((resolve, reject) => {
        const req = client.request(url, { method: 'GET', timeout: 5000 }, (res) => {
          res.on('data', () => {}); // consume response
          res.on('end', () => {
            const latency = Date.now() - startTime;
            latencies.push(latency);
            logInfo(`Request ${i}/10: ${latency}ms`);
            resolve();
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('TIMEOUT'));
        });

        req.end();
      });

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      logError(`Request ${i}/10 failed: ${error.message}`);
    }
  }

  if (latencies.length === 0) {
    logError('All requests failed - cannot measure latency');
    return { success: false };
  }

  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const min = Math.min(...latencies);
  const max = Math.max(...latencies);
  const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('Latency Statistics:', colors.blue);
  logInfo(`Successful requests: ${latencies.length}/10`);
  logInfo(`Average: ${avg.toFixed(2)}ms`);
  logInfo(`Min: ${min}ms`);
  logInfo(`Max: ${max}ms`);
  logInfo(`P95: ${p95}ms`);

  if (avg < 10) {
    logSuccess('Latency EXCELLENT (< 10ms) - stessa LAN');
  } else if (avg < 50) {
    logSuccess('Latency GOOD (< 50ms) - datacenter vicino');
  } else if (avg < 200) {
    logInfo('Latency ACCEPTABLE (< 200ms) - routing via gateway');
  } else {
    logError('Latency HIGH (> 200ms) - connection lenta o instabile');
  }

  return { success: true, avg, min, max, p95, count: latencies.length };
}

async function testThroughput() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('TEST: Throughput (large payload)', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const protocol = USE_HTTPS ? 'https' : 'http';
  const client = USE_HTTPS ? https : http;

  // Generate 1MB payload
  const payload = JSON.stringify({
    test: 'throughput',
    data: 'x'.repeat(1024 * 1024)
  });

  logInfo(`Sending ${(payload.length / 1024 / 1024).toFixed(2)}MB payload...`);

  const startTime = Date.now();

  return new Promise((resolve) => {
    const req = client.request({
      hostname: MACHINE_HOST,
      port: MACHINE_PORT,
      path: '/echo',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length,
      },
      timeout: 30000,
    }, (res) => {
      let received = 0;

      res.on('data', (chunk) => {
        received += chunk.length;
      });

      res.on('end', () => {
        const duration = Date.now() - startTime;
        const throughputMbps = (payload.length * 8 / 1024 / 1024) / (duration / 1000);

        logSuccess('Throughput test SUCCESS');
        logInfo(`Duration: ${duration}ms`);
        logInfo(`Throughput: ${throughputMbps.toFixed(2)} Mbps`);

        if (throughputMbps > 100) {
          logSuccess('Throughput EXCELLENT (> 100 Mbps)');
        } else if (throughputMbps > 10) {
          logInfo('Throughput GOOD (> 10 Mbps)');
        } else {
          logError('Throughput LOW (< 10 Mbps) - network bottleneck');
        }

        resolve({ success: true, duration, throughputMbps });
      });
    });

    req.on('error', (error) => {
      logError(`Throughput test FAILED: ${error.message}`);
      resolve({ success: false, error: error.message });
    });

    req.write(payload);
    req.end();
  });
}

async function main() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════╗', colors.blue);
  log('║     VDI → MACCHINA SEPARATA CONNECTIVITY TEST         ║', colors.blue);
  log('╚═══════════════════════════════════════════════════════╝', colors.blue);

  logInfo(`Target: ${USE_HTTPS ? 'https' : 'http'}://${MACHINE_HOST}:${MACHINE_PORT}`);
  logInfo(`\nCONFIGURAZIONE:`);
  logInfo(`Modifica variabili d'ambiente se necessario:`);
  logInfo(`  export MACHINE_HOST=<ip-or-hostname>`);
  logInfo(`  export MACHINE_PORT=3001`);
  logInfo(`  export USE_HTTPS=false`);

  const results = {
    connection: null,
    latency: null,
    throughput: null,
    timestamp: new Date().toISOString(),
  };

  results.connection = await testHTTPConnection();

  if (results.connection.success) {
    results.latency = await testLatency();
    results.throughput = await testThroughput();
  } else {
    logError('\nSkipping latency/throughput tests - connection failed');
  }

  // Summary
  log('\n');
  log('╔═══════════════════════════════════════════════════════╗', colors.blue);
  log('║                  FINAL SUMMARY                        ║', colors.blue);
  log('╚═══════════════════════════════════════════════════════╝', colors.blue);
  log('\n');

  if (results.connection.success) {
    logSuccess('✓ VDI può raggiungere la macchina separata');

    if (results.latency?.success) {
      logInfo(`Latency media: ${results.latency.avg.toFixed(2)}ms`);
    }

    if (results.throughput?.success) {
      logInfo(`Throughput: ${results.throughput.throughputMbps.toFixed(2)} Mbps`);
    }

    log('\n📋 RACCOMANDAZIONE:', colors.green);
    logInfo('Architettura con macchina separata è FATTIBILE');
    logInfo('Backend in VDI può comunicare con AI Service su macchina separata');

  } else {
    logError('✗ VDI NON può raggiungere la macchina separata');
    log('\n📋 RACCOMANDAZIONE:', colors.red);
    logInfo('Opzioni:');
    logInfo('1. Contattare IT per aprire firewall tra VDI e macchina');
    logInfo('2. Usare Opzione 1 (Backend Monolitico tutto in VDI)');
    logInfo('3. Usare Opzione 3 (AWS Lambda) che bypassa problema network interno');
  }

  // Save results
  const fs = require('fs');
  const resultsFile = `vdi-machine-test-results-${Date.now()}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  log('\n');
  logInfo(`Results saved to: ${resultsFile}`);
}

main().catch(console.error);
