require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
  await pool.query(sql);
  // eslint-disable-next-line no-console
  console.log('Seed data inserted successfully.');
  console.log('Default Super Admin login -> username: superadmin | password: SuperAdmin@2026');
  console.log('CHANGE THIS PASSWORD IMMEDIATELY.');
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
