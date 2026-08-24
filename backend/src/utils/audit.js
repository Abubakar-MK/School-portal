const { pool } = require('../config/db');

/**
 * Record an audit log entry. Never throws — a logging failure must not
 * block the underlying action, but we do log to stderr so it's visible.
 */
async function logAction({ userId, role, action, target, details, ip }) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, role, action, target, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, role || null, action, target || null, details ? JSON.stringify(details) : null, ip || null]
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAction };
