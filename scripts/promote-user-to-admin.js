#!/usr/bin/env node

/**
 * Script per promuovere un utente a ruolo ADMIN direttamente nel database
 * Usage: node promote-user-to-admin.js <email_or_matricola>
 */

const { DataSource } = require('typeorm');
const path = require('path');

const COLOR = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m'
};

function log(type, message) {
  const colors = { INFO: COLOR.BLUE, SUCCESS: COLOR.GREEN, ERROR: COLOR.RED };
  console.log(`${colors[type]}[${type}]${COLOR.RESET} ${message}`);
}

async function main() {
  const userIdentifier = process.argv[2];

  if (!userIdentifier) {
    console.error('Usage: node promote-user-to-admin.js <email_or_matricola>');
    console.error('');
    console.error('Example:');
    console.error('  node promote-user-to-admin.js testTEST745215@ca.it');
    console.error('  node promote-user-to-admin.js TEST745215');
    process.exit(1);
  }

  log('INFO', `Promoting user: ${userIdentifier}`);

  // Create database connection
  const AppDataSource = new DataSource({
    type: 'sqlite',
    database: path.join(__dirname, '../backend/data/quotations.db'),
    synchronize: false,
    logging: false
  });

  try {
    await AppDataSource.initialize();
    log('SUCCESS', 'Database connection established');

    // Find user by email or matricola
    const isEmail = userIdentifier.includes('@');
    const query = isEmail
      ? `SELECT * FROM user WHERE email = ?`
      : `SELECT * FROM user WHERE matricola = ?`;

    const users = await AppDataSource.query(query, [userIdentifier]);

    if (users.length === 0) {
      log('ERROR', `User not found: ${userIdentifier}`);
      process.exit(1);
    }

    const user = users[0];
    log('INFO', `Found user: ${user.email} (${user.matricola})`);
    log('INFO', `Current role: ${user.role}`);

    if (user.role === 'ADMIN') {
      log('SUCCESS', 'User is already an admin');
      process.exit(0);
    }

    // Update role to ADMIN
    await AppDataSource.query(
      `UPDATE user SET role = 'ADMIN' WHERE id = ?`,
      [user.id]
    );

    log('SUCCESS', `✅ User promoted to ADMIN`);
    log('INFO', `Email: ${user.email}`);
    log('INFO', `Matricola: ${user.matricola}`);
    log('INFO', `New role: ADMIN`);

    await AppDataSource.destroy();

  } catch (error) {
    log('ERROR', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
