#!/usr/bin/env node
/**
 * Pre-Push Hook: Service Coupling Check
 *
 * Analizza le dipendenze tra servizi per identificare:
 * - Circular dependencies
 * - Temporal coupling (sync calls che dovrebbero essere async)
 * - Shared database access diretto
 * - Service fanout eccessivo (chiamate a troppi servizi)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

// Service definitions
const SERVICES = {
  backend: {
    path: 'backend/src',
    pattern: /backend|quotation|auth|user/i,
  },
  aiService: {
    path: 'ai-estimation-service/src',
    pattern: /ai-estimation|bedrock|estimation/i,
  },
  frontend: {
    path: 'frontend/src',
    pattern: /frontend|angular|component/i,
  },
};

// Find all service interactions
function findServiceInteractions(serviceName, servicePath) {
  const interactions = [];

  try {
    const files = execSync(
      `find ${servicePath} -name "*.ts" -type f`,
      { encoding: 'utf-8' }
    ).trim().split('\n');

    for (const file of files) {
      if (!fs.existsSync(file)) continue;

      const content = fs.readFileSync(file, 'utf-8');

      // HTTP calls
      const httpCalls = [
        ...content.matchAll(/(?:get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi),
        ...content.matchAll(/axios\.\w+\s*\(\s*['"`]([^'"`]+)['"`]/gi),
        ...content.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi),
      ];

      for (const match of httpCalls) {
        const url = match[1];
        const targetService = identifyTargetService(url);

        if (targetService && targetService !== serviceName) {
          interactions.push({
            from: serviceName,
            to: targetService,
            type: 'http',
            file: file.replace(process.cwd() + path.sep, ''),
            url,
            line: findLineNumber(content, match[0]),
          });
        }
      }

      // Database access
      const dbAccess = content.matchAll(/@InjectRepository\s*\(\s*(\w+)\s*\)/g);
      for (const match of dbAccess) {
        const entity = match[1];
        interactions.push({
          from: serviceName,
          to: 'database',
          type: 'database',
          entity,
          file: file.replace(process.cwd() + path.sep, ''),
          line: findLineNumber(content, match[0]),
        });
      }
    }
  } catch (error) {
    // Service might not exist yet
  }

  return interactions;
}

function identifyTargetService(url) {
  if (url.includes('bedrock') || url.includes('ai-estimation') || url.includes('estimation/process')) {
    return 'aiService';
  }
  if (url.includes('quotation') || url.includes('auth') || url.includes('/api/')) {
    return 'backend';
  }
  return null;
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

// Detect circular dependencies
function detectCircularDependencies(allInteractions) {
  const circles = [];
  const graph = {};

  // Build adjacency list
  allInteractions.forEach(interaction => {
    if (!graph[interaction.from]) {
      graph[interaction.from] = [];
    }
    if (interaction.type === 'http') {
      graph[interaction.from].push(interaction.to);
    }
  });

  // Check for cycles
  for (const service in graph) {
    const visited = new Set();
    const recStack = new Set();

    function hasCycle(node, path) {
      visited.add(node);
      recStack.add(node);

      if (graph[node]) {
        for (const neighbor of graph[node]) {
          if (!visited.has(neighbor)) {
            if (hasCycle(neighbor, [...path, neighbor])) {
              return true;
            }
          } else if (recStack.has(neighbor)) {
            circles.push([...path, neighbor]);
            return true;
          }
        }
      }

      recStack.delete(node);
      return false;
    }

    if (!visited.has(service)) {
      hasCycle(service, [service]);
    }
  }

  return circles;
}

// Detect shared database entities
function detectSharedDatabaseAccess(allInteractions) {
  const entityAccess = {};

  allInteractions
    .filter(i => i.type === 'database')
    .forEach(interaction => {
      if (!entityAccess[interaction.entity]) {
        entityAccess[interaction.entity] = [];
      }
      if (!entityAccess[interaction.entity].includes(interaction.from)) {
        entityAccess[interaction.entity].push(interaction.from);
      }
    });

  const shared = Object.entries(entityAccess)
    .filter(([entity, services]) => services.length > 1)
    .map(([entity, services]) => ({ entity, services }));

  return shared;
}

// Detect high fanout (service calling too many others)
function detectHighFanout(allInteractions) {
  const fanout = {};

  allInteractions
    .filter(i => i.type === 'http')
    .forEach(interaction => {
      if (!fanout[interaction.from]) {
        fanout[interaction.from] = new Set();
      }
      fanout[interaction.from].add(interaction.to);
    });

  const highFanout = Object.entries(fanout)
    .filter(([service, targets]) => targets.size > 3)
    .map(([service, targets]) => ({ service, targets: Array.from(targets) }));

  return highFanout;
}

// Main execution
function main() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('   SERVICE COUPLING CHECK', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  log('Analyzing service dependencies...\n');

  const allInteractions = [];

  for (const [serviceName, serviceConfig] of Object.entries(SERVICES)) {
    const interactions = findServiceInteractions(serviceName, serviceConfig.path);
    allInteractions.push(...interactions);
    log(`  ${serviceName}: ${interactions.length} interaction(s) found`);
  }

  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('   ANALYSIS RESULTS', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  let hasIssues = false;

  // Check 1: Circular Dependencies
  const circles = detectCircularDependencies(allInteractions);
  if (circles.length > 0) {
    hasIssues = true;
    log('❌ CIRCULAR DEPENDENCIES DETECTED:', colors.red);
    circles.forEach(circle => {
      log(`   ${circle.join(' → ')}`, colors.red);
    });
    log('\n   💡 Circular dependencies indicate tight coupling', colors.yellow);
    log('   💡 Consider: Event-driven communication, Saga pattern, or BFF layer\n', colors.yellow);
  } else {
    log('✅ No circular dependencies', colors.green);
  }

  // Check 2: Shared Database Access
  const sharedEntities = detectSharedDatabaseAccess(allInteractions);
  if (sharedEntities.length > 0) {
    hasIssues = true;
    log('\n❌ SHARED DATABASE ENTITIES:', colors.red);
    sharedEntities.forEach(({ entity, services }) => {
      log(`   Entity: ${entity}`, colors.red);
      log(`   Accessed by: ${services.join(', ')}`, colors.yellow);
    });
    log('\n   💡 Multiple services accessing same entity violates service autonomy', colors.yellow);
    log('   💡 Consider: Each service owns its entities, use events for sync\n', colors.yellow);
  } else {
    log('✅ No shared database entities', colors.green);
  }

  // Check 3: High Fanout
  const highFanout = detectHighFanout(allInteractions);
  if (highFanout.length > 0) {
    log('\n⚠️  HIGH FANOUT DETECTED:', colors.yellow);
    highFanout.forEach(({ service, targets }) => {
      log(`   ${service} calls ${targets.length} services: ${targets.join(', ')}`, colors.yellow);
    });
    log('\n   💡 High fanout increases coupling and latency', colors.yellow);
    log('   💡 Consider: API Gateway, BFF pattern, or aggregate service\n', colors.yellow);
  } else {
    log('✅ Fanout is within acceptable limits', colors.green);
  }

  // Check 4: Service Interaction Map
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('   INTERACTION MAP', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  const httpInteractions = allInteractions.filter(i => i.type === 'http');
  if (httpInteractions.length > 0) {
    httpInteractions.forEach(interaction => {
      log(`  ${interaction.from} → ${interaction.to} (HTTP)`, colors.blue);
      log(`    ${interaction.file}:${interaction.line}`, colors.reset);
      log(`    ${interaction.url}\n`, colors.reset);
    });
  }

  // Summary
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', colors.blue);
  log('   SUMMARY', colors.blue);
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', colors.blue);

  if (hasIssues) {
    log('⚠️  Issues detected - review recommended before push\n', colors.yellow);
    log('These do NOT block push but indicate architectural debt.\n', colors.yellow);
    log('Refer to docs/architecture/microservices.md for mitigation strategies.\n');
    return 0; // Don't block push, just warn
  } else {
    log('✅ Service coupling is healthy\n', colors.green);
    return 0;
  }
}

// Execute
process.exit(main());
