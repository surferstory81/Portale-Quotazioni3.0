/**
 * Simple HTTP Test Server
 *
 * Avviare sulla macchina separata per test connectivity da VDI
 *
 * Usage:
 *   node simple-http-server.js
 */

const http = require('http');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

const server = http.createServer((req, res) => {
  const timestamp = new Date().toISOString();
  const clientIP = req.socket.remoteAddress;

  log(`[${timestamp}] ${req.method} ${req.url} from ${clientIP}`, colors.blue);

  // Health endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      server: 'simple-test-server',
    }));
    return;
  }

  // Echo endpoint (for throughput test)
  if (req.url === '/echo' && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
    });

    req.on('end', () => {
      const sizeKB = (body.length / 1024).toFixed(2);
      log(`  Received ${sizeKB}KB payload`, colors.yellow);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        echo: 'received',
        size: body.length,
        timestamp: new Date().toISOString(),
      }));
    });

    return;
  }

  // Default response
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Simple HTTP Test Server',
    endpoints: {
      '/health': 'Health check endpoint',
      '/echo': 'POST echo endpoint for throughput test',
    },
    timestamp: new Date().toISOString(),
  }));
});

server.listen(PORT, HOST, () => {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════╗', colors.green);
  log('║          SIMPLE HTTP TEST SERVER STARTED              ║', colors.green);
  log('╚═══════════════════════════════════════════════════════╝', colors.green);
  log('\n');
  log(`Server listening on: http://${HOST}:${PORT}`, colors.green);
  log(`\nEndpoints:`, colors.blue);
  log(`  GET  http://${HOST}:${PORT}/health`);
  log(`  POST http://${HOST}:${PORT}/echo`);
  log(`\nPress Ctrl+C to stop`);
  log('\n');

  // Log network interfaces
  const os = require('os');
  const interfaces = os.networkInterfaces();
  log('Network interfaces:', colors.yellow);

  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        log(`  ${ifname}: ${iface.address}`, colors.yellow);
        log(`  → Test from VDI: export MACHINE_HOST=${iface.address}`, colors.blue);
      }
    });
  });

  log('\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  log('\nShutting down server...', colors.yellow);
  server.close(() => {
    log('Server stopped', colors.green);
    process.exit(0);
  });
});
