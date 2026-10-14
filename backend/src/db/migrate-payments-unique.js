require('dotenv').config();
const { pool } = require('../config/db');

// One-time cleanup + a permanent rule: from now on, a result can only
// ever have ONE row in `payments` -- not one per attempt. Retrying a
// failed/pending payment overwrites that same row instead of piling
// up a new one, which is what was causing a student's name to appear
// over and over in the Super Admin's Payments list.
//
// Safe to run against a database that already has many duplicate
// attempts: it keeps the best row per result (a successful one if any
// exists, otherwise the most recent attempt) and removes the rest
// before locking in the one-row-per-result rule.

const sql = `
  WITH ranked AS (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY result_id
        ORDER BY (status = 'success') DESC, created_at DESC
      ) AS rn
    FROM payments
  )
  DELETE FROM payments WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

  ALTER TABLE payments
    DROP CONSTRAINT IF EXISTS payments_result_id_unique;
  ALTER TABLE payments
    ADD CONSTRAINT payments_result_id_unique UNIQUE (result_id);
`;

async function main() {
  await pool.query(sql);
  // eslint-disable-next-line no-console
  console.log('Payments de-duplicated; one-row-per-result rule is now enforced.');
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', err.message);
  process.exit(1);
});
