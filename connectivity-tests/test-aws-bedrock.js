/**
 * AWS Bedrock Connectivity Test
 *
 * Verifica:
 * 1. Network connectivity a AWS endpoints
 * 2. IAM credentials validity
 * 3. Bedrock API accessibility
 * 4. Latency measurements
 *
 * Usage:
 *   node test-aws-bedrock.js
 *
 * Richiede:
 *   npm install @aws-sdk/client-bedrock-runtime
 */

const https = require('https');
const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime');

// CONFIGURAZIONE - Modificare questi valori
const AWS_REGION = process.env.AWS_REGION || 'eu-central-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const MODEL_ID = 'eu.anthropic.claude-sonnet-4-5-20250929-v1:0';

// Colori per output
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

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Test 1: Network connectivity to AWS endpoint
async function testNetworkConnectivity() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('TEST 1: Network Connectivity to AWS', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const endpoint = `bedrock-runtime.${AWS_REGION}.amazonaws.com`;

  return new Promise((resolve) => {
    const startTime = Date.now();

    const req = https.request({
      hostname: endpoint,
      port: 443,
      path: '/',
      method: 'GET',
      timeout: 10000,
    }, (res) => {
      const latency = Date.now() - startTime;

      logSuccess(`Network connectivity OK`);
      logInfo(`Endpoint: https://${endpoint}`);
      logInfo(`Status Code: ${res.statusCode}`);
      logInfo(`Latency: ${latency}ms`);

      if (res.statusCode === 403) {
        logInfo('403 Forbidden è normale - significa che l\'endpoint è raggiungibile ma richiede autenticazione');
      }

      if (latency > 1000) {
        logWarning(`Latency alta (${latency}ms) - potrebbe impattare performance`);
      }

      resolve({ success: true, latency });
    });

    req.on('error', (error) => {
      const latency = Date.now() - startTime;

      logError(`Network connectivity FAILED`);
      logError(`Error: ${error.message}`);

      if (error.code === 'ENOTFOUND') {
        logError('DNS resolution failed - firewall potrebbe bloccare DNS o endpoint');
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
        logError('Connection timeout - firewall probabilmente blocca porta 443');
      } else if (error.message.includes('CERT')) {
        logError('SSL certificate error - potrebbe essere proxy corporate con SSL inspection');
      }

      logInfo('\nPossibili cause:');
      logInfo('- Firewall aziendale blocca traffico verso AWS');
      logInfo('- Proxy corporate non configurato correttamente');
      logInfo('- Rete non ha accesso Internet esterno');
      logInfo('- Whitelist AWS endpoints richiesta');

      resolve({ success: false, error: error.message, latency });
    });

    req.on('timeout', () => {
      req.destroy();
      const latency = Date.now() - startTime;
      logError('Connection timeout after 10s');
      resolve({ success: false, error: 'TIMEOUT', latency });
    });

    req.end();
  });
}

// Test 2: AWS Credentials validity
async function testAWSCredentials() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('TEST 2: AWS IAM Credentials', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    logError('AWS credentials NON configurate');
    logInfo('Configura le variabili d\'ambiente:');
    logInfo('  export AWS_ACCESS_KEY_ID=<your-key>');
    logInfo('  export AWS_SECRET_ACCESS_KEY=<your-secret>');
    logInfo('  export AWS_REGION=eu-central-1');
    return { success: false, error: 'MISSING_CREDENTIALS' };
  }

  logSuccess('AWS credentials configurate');
  logInfo(`Access Key ID: ${AWS_ACCESS_KEY_ID.substring(0, 8)}...`);
  logInfo(`Region: ${AWS_REGION}`);

  // Verifica formato
  if (!AWS_ACCESS_KEY_ID.startsWith('AKIA')) {
    logWarning('Access Key ID non inizia con AKIA - formato potrebbe essere invalido');
  }

  if (AWS_SECRET_ACCESS_KEY.length !== 40) {
    logWarning('Secret Access Key non ha lunghezza standard (40 caratteri)');
  }

  return { success: true };
}

// Test 3: Bedrock API call
async function testBedrockAPI() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('TEST 3: AWS Bedrock API Call', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    logError('Skipped - credentials mancanti');
    return { success: false, skipped: true };
  }

  try {
    const client = new BedrockRuntimeClient({
      region: AWS_REGION,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
      requestHandler: {
        requestTimeout: 30000,
      },
    });

    logInfo(`Testing model: ${MODEL_ID}`);
    logInfo('Sending test request to Bedrock...');

    const startTime = Date.now();

    const command = new ConverseCommand({
      modelId: MODEL_ID,
      messages: [
        {
          role: 'user',
          content: [{ text: 'Rispondi solo con "OK"' }],
        },
      ],
      inferenceConfig: {
        maxTokens: 10,
        temperature: 1.0,
      },
    });

    const response = await client.send(command);
    const latency = Date.now() - startTime;

    logSuccess('Bedrock API call SUCCESS');
    logInfo(`Response time: ${latency}ms`);
    logInfo(`Stop reason: ${response.stopReason}`);

    if (response.output?.message?.content?.[0]?.text) {
      logInfo(`Response: ${response.output.message.content[0].text}`);
    }

    logInfo(`\nMetrics:`);
    logInfo(`- Input tokens: ${response.usage?.inputTokens || 0}`);
    logInfo(`- Output tokens: ${response.usage?.outputTokens || 0}`);

    const estimatedCost = (
      (response.usage?.inputTokens || 0) * 0.003 / 1000 +
      (response.usage?.outputTokens || 0) * 0.015 / 1000
    );
    logInfo(`- Estimated cost: $${estimatedCost.toFixed(6)}`);

    if (latency > 5000) {
      logWarning(`Latency molto alta (${latency}ms) - connection potrebbe essere instabile`);
    }

    return { success: true, latency, usage: response.usage };

  } catch (error) {
    logError('Bedrock API call FAILED');
    logError(`Error: ${error.message}`);

    if (error.name === 'ValidationException') {
      logError('Validation error - model ID potrebbe essere invalido o non disponibile nella region');
      logInfo(`Model ID testato: ${MODEL_ID}`);
    } else if (error.name === 'UnrecognizedClientException' || error.message.includes('security token')) {
      logError('AWS credentials INVALIDE o SCADUTE');
      logInfo('Verifica:');
      logInfo('1. Access Key ID e Secret Access Key sono corretti');
      logInfo('2. Credentials non sono scadute');
      logInfo('3. IAM user ha le permission necessarie');
    } else if (error.name === 'AccessDeniedException') {
      logError('IAM permissions INSUFFICIENTI');
      logInfo('L\'IAM user necessita della policy:');
      logInfo('  {');
      logInfo('    "Effect": "Allow",');
      logInfo('    "Action": "bedrock:InvokeModel",');
      logInfo('    "Resource": "arn:aws:bedrock:eu-central-1::foundation-model/*"');
      logInfo('  }');
    } else if (error.name === 'ResourceNotFoundException') {
      logError('Model NON trovato nella region');
      logInfo(`Model: ${MODEL_ID}`);
      logInfo(`Region: ${AWS_REGION}`);
      logInfo('Verifica che il model sia disponibile in questa region');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      logError('Network error - vedi Test 1 per dettagli connectivity');
    } else if (error.message.includes('timeout')) {
      logError('Request timeout - connection troppo lenta o instabile');
    }

    logError(`\nError details:`);
    logError(`  Name: ${error.name}`);
    logError(`  Code: ${error.code || 'N/A'}`);
    logError(`  Message: ${error.message}`);

    return { success: false, error: error.message };
  }
}

// Test 4: Sustained load test
async function testSustainedLoad() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('TEST 4: Sustained Load & Stability', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
    logError('Skipped - credentials mancanti');
    return { success: false, skipped: true };
  }

  logInfo('Executing 3 consecutive requests to test stability...');

  const results = [];

  for (let i = 1; i <= 3; i++) {
    logInfo(`\nRequest ${i}/3...`);

    try {
      const client = new BedrockRuntimeClient({
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
      });

      const startTime = Date.now();

      const command = new ConverseCommand({
        modelId: MODEL_ID,
        messages: [{ role: 'user', content: [{ text: 'Test' }] }],
        inferenceConfig: { maxTokens: 10, temperature: 1.0 },
      });

      await client.send(command);
      const latency = Date.now() - startTime;

      logSuccess(`Request ${i} OK (${latency}ms)`);
      results.push({ success: true, latency });

    } catch (error) {
      logError(`Request ${i} FAILED: ${error.message}`);
      results.push({ success: false, error: error.message });
    }

    // Wait 2s between requests
    if (i < 3) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failureCount = results.length - successCount;
  const avgLatency = results
    .filter(r => r.success)
    .reduce((sum, r) => sum + r.latency, 0) / (successCount || 1);

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('Stability Summary:', colors.blue);
  logInfo(`Success rate: ${successCount}/3 (${(successCount/3*100).toFixed(0)}%)`);

  if (successCount > 0) {
    logInfo(`Average latency: ${avgLatency.toFixed(0)}ms`);
  }

  if (successCount === 3) {
    logSuccess('Connection STABILE ✓');
  } else if (successCount >= 2) {
    logWarning('Connection PARZIALMENTE STABILE (alcuni fallimenti)');
  } else {
    logError('Connection INSTABILE (troppi fallimenti)');
  }

  return {
    success: successCount === 3,
    successRate: successCount / 3,
    avgLatency,
    results
  };
}

// Test 5: Proxy detection
async function testProxyConfiguration() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('TEST 5: Proxy Configuration', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy;
  const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const noProxy = process.env.NO_PROXY || process.env.no_proxy;

  if (httpProxy || httpsProxy) {
    logInfo('Proxy configuration detected:');
    if (httpProxy) logInfo(`  HTTP_PROXY: ${httpProxy}`);
    if (httpsProxy) logInfo(`  HTTPS_PROXY: ${httpsProxy}`);
    if (noProxy) logInfo(`  NO_PROXY: ${noProxy}`);

    logInfo('\nAWS SDK will use these proxy settings automatically');
  } else {
    logInfo('No proxy configuration detected');
    logInfo('If your network requires a proxy, set:');
    logInfo('  export HTTPS_PROXY=http://proxy.company.com:8080');
  }

  return { success: true, hasProxy: !!(httpProxy || httpsProxy) };
}

// Main execution
async function main() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════╗', colors.blue);
  log('║   AWS BEDROCK CONNECTIVITY TEST SUITE                ║', colors.blue);
  log('║   Verifica: Network, Credentials, API, Stability     ║', colors.blue);
  log('╚═══════════════════════════════════════════════════════╝', colors.blue);

  const testResults = {
    network: null,
    credentials: null,
    api: null,
    sustained: null,
    proxy: null,
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    }
  };

  try {
    // Execute all tests
    testResults.network = await testNetworkConnectivity();
    testResults.credentials = await testAWSCredentials();
    testResults.proxy = await testProxyConfiguration();

    // Only run API tests if network is OK
    if (testResults.network.success) {
      testResults.api = await testBedrockAPI();

      // Only run sustained test if API test passed
      if (testResults.api.success) {
        testResults.sustained = await testSustainedLoad();
      }
    } else {
      logWarning('\nSkipping API tests - network connectivity failed');
    }

    // Final summary
    log('\n');
    log('╔═══════════════════════════════════════════════════════╗', colors.blue);
    log('║                  FINAL SUMMARY                        ║', colors.blue);
    log('╚═══════════════════════════════════════════════════════╝', colors.blue);
    log('\n');

    const overallSuccess =
      testResults.network?.success &&
      testResults.credentials?.success &&
      testResults.api?.success &&
      testResults.sustained?.success;

    if (overallSuccess) {
      logSuccess('✓ TUTTI I TEST PASSATI - AWS Bedrock è accessibile e stabile');
      log('\n📋 RACCOMANDAZIONE:', colors.green);
      logInfo('Questa macchina PUÒ essere usata per hostare AI Service');
      logInfo('Architettura consigliata: Opzione 2 (Outbox Polling) o Opzione 4 (Hybrid)');
    } else {
      logError('✗ ALCUNI TEST FALLITI - Verificare i dettagli sopra');
      log('\n📋 RACCOMANDAZIONE:', colors.red);

      if (!testResults.network?.success) {
        logError('Network connectivity BLOCCATA');
        logInfo('Possibili soluzioni:');
        logInfo('1. Contattare IT per whitelist AWS endpoints');
        logInfo('2. Configurare proxy correttamente');
        logInfo('3. Usare Opzione 3 (AWS Lambda) che bypassa il problema');
      } else if (!testResults.credentials?.success) {
        logError('AWS credentials mancanti o invalide');
        logInfo('Configurare credentials IAM valide');
      } else if (!testResults.api?.success) {
        logError('AWS Bedrock API non accessibile');
        logInfo('Verificare IAM permissions e model availability');
      } else if (!testResults.sustained?.success) {
        logWarning('Connection instabile');
        logInfo('Considerare retry logic robusto o AWS Lambda');
      }
    }

    // Save results to file
    const fs = require('fs');
    const resultsFile = `connectivity-test-results-${Date.now()}.json`;
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    log('\n');
    logInfo(`Test results saved to: ${resultsFile}`);

  } catch (error) {
    logError(`\nUnexpected error during test execution:`);
    logError(error.message);
    logError(error.stack);
    process.exit(1);
  }
}

// Run tests
main().catch(console.error);
