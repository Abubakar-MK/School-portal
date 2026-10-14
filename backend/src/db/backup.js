require('dotenv').config();
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');

// Exports the ENTIRE live database (every table, every row) to a single
// timestamped .sql file on this computer. Run this periodically -- e.g.
// weekly -- while .env is temporarily pointed at Render's database, the
// same way you already do for migrations. Requires the `pg_dump` tool,
// which comes bundled with PostgreSQL (you already have it locally).

const backupsDir = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(backupsDir, `backup-${timestamp}.sql`);

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL is not set. Point .env at the database you want to back up first.');
  process.exit(1);
}

execFile('pg_dump', [dbUrl, '-f', outFile], (err) => {
  if (err) {
    console.error('Backup failed:', err.message);
    console.error('If this says "pg_dump is not recognized", add PostgreSQL\'s bin folder to your PATH (e.g. C:\\Program Files\\PostgreSQL\\16\\bin) and try again.');
    process.exit(1);
  }
  console.log(`Backup saved to: ${outFile}`);
});
