#!/usr/bin/env node

/**
 * Script per promuovere un utente a ruolo ADMIN usando sqlite3
 * Usage: node promote-user-simple.js <email_or_matricola>
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const COLOR = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

function log(type, message) {
  const colors = { INFO: COLOR.BLUE, SUCCESS: COLOR.GREEN, ERROR: COLOR.RED };
  console.log(`${colors[type]}[${type}]${COLOR.RESET} ${message}`);
}

const userIdentifier = process.argv[2];

if (!userIdentifier) {
  console.error('Usage: node promote-user-simple.js <email_or_matricola>');
  console.error('');
  console.error('Example:');
  console.error('  node promote-user-simple.js testTEST745215@ca.it');
  process.exit(1);
}

const dbPath = path.join(__dirname, '../backend/data/quotations.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    log('ERROR', `Database connection failed: ${err.message}`);
    process.exit(1);
  }
  log('INFO', 'Database connection established');
});

const isEmail = userIdentifier.includes('@');
const query = isEmail
  ? `SELECT * FROM user WHERE email = ?`
  : `SELECT * FROM user WHERE matricola = ?`;

db.get(query, [userIdentifier], (err, user) => {
  if (err) {
    log('ERROR', err.message);
    db.close();
    process.exit(1);
  }

  if (!user) {
    log('ERROR', `User not found: ${userIdentifier}`);
    db.close();
    process.exit(1);
  }

  log('INFO', `Found user: ${user.email} (${user.matricola})`);
  log('INFO', `Current role: ${user.role}`);

  if (user.role === 'ADMIN') {
    log('SUCCESS', 'User is already an admin');
    db.close();
    process.exit(0);
  }

  db.run(`UPDATE user SET role = 'ADMIN' WHERE id = ?`, [user.id], function(err) {
    if (err) {
      log('ERROR', err.message);
      db.close();
      process.exit(1);
    }

    log('SUCCESS', `✅ User promoted to ADMIN`);
    log('INFO', `Email: ${user.email}`);
    log('INFO', `Matricola: ${user.matricola}`);
    log('INFO', `New role: ADMIN`);

    db.close();
  });
});