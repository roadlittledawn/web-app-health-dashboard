#!/usr/bin/env node

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== Health Dashboard - Secret Generation ===\n');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('✓ Generated JWT Secret (copy to .env as JWT_SECRET):');
console.log(`\n  ${jwtSecret}\n`);

// Prompt for password
rl.question('Enter your admin password (or press Enter to skip): ', async (password) => {
  if (password && password.trim().length > 0) {
    console.log('\nGenerating password hash (this may take a few seconds)...');

    try {
      const hash = await bcrypt.hash(password.trim(), 12);
      console.log('\n✓ Generated Password Hash (copy to .env as ADMIN_PASSWORD_HASH):');
      console.log(`\n  ${hash}\n`);
    } catch (error) {
      console.error('\n✗ Error generating password hash:', error.message);
    }
  }

  console.log('\nAdd these values to your .env file:');
  console.log('  JWT_SECRET=' + jwtSecret);
  if (password && password.trim().length > 0) {
    console.log('  ADMIN_PASSWORD_HASH=<the hash shown above>');
  }
  console.log('  ADMIN_USERNAME=<your-username>\n');

  rl.close();
});
