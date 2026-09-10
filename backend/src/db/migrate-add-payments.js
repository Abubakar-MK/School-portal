require('dotenv').config();
const { pool } = require('../config/db');

// A small, targeted migration — safe to run against a database that
// already has data (unlike re-running the full schema.sql, which
// would fail on every table that already exists). Only adds what the
// "pay to view your result" feature needs; touches nothing else.
const sql = `
  ALTER TABLE results ADD COLUMN IF NOT EXISTS access_granted BOOLEAN NOT NULL DEFAULT false;

  CREATE TABLE IF NOT EXISTS payments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id     UUID NOT NULL REFERENCES results(id) ON DELETE CASCADE,
    student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    reference     VARCHAR(100) UNIQUE NOT NULL,
    amount        NUMERIC(10,2) NOT NULL,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending',
    gateway       VARCHAR(20) NOT NULL DEFAULT 'flutterwave',
    gateway_raw   JSONB,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    verified_at   TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_payments_result ON payments(result_id);
  CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
`;

async function main() {
  await pool.query(sql);
  // eslint-disable-next-line no-console
  console.log('Payments feature migration applied successfully.');
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', err.message);
  process.exit(1);
});
