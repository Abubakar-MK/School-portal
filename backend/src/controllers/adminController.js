const { pool } = require('../config/db');
const { hashPassword } = require('../utils/password');
const { logAction } = require('../utils/audit');
const crypto = require('crypto');

async function listAdmins(_req, res) {
  const { rows } = await pool.query(
    `SELECT a.id, a.full_name, a.email, a.phone, u.username, u.is_active, a.created_at
     FROM admins a JOIN users u ON u.id = a.user_id
     ORDER BY a.created_at DESC`
  );
  res.json(rows);
}

/**
 * Only a Super Admin can reach this route (enforced in routes file).
 * A temporary password is generated and returned ONCE so the Super
 * Admin can hand it to the new admin; it is never stored or logged
 * in plaintext.
 */
async function createAdmin(req, res) {
  const { username, fullName, email, phone } = req.body;
  if (!username || !fullName) {
    return res.status(400).json({ error: 'Username and full name are required.' });
  }
  const tempPassword = crypto.randomBytes(6).toString('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: userRows } = await client.query(
      `INSERT INTO users (role, username, password_hash, must_change_password)
       VALUES ('admin', $1, $2, true) RETURNING id`,
      [username, hashPassword(tempPassword)]
    );
    const { rows: adminRows } = await client.query(
      `INSERT INTO admins (user_id, full_name, email, phone, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [userRows[0].id, fullName, email || null, phone || null, req.user.id]
    );
    await client.query('COMMIT');
    await logAction({ userId: req.user.id, role: 'super_admin', action: 'ADMIN_CREATED', target: username });
    res.status(201).json({ admin: adminRows[0], temporaryPassword: tempPassword });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return res.status(409).json({ error: 'That username is already taken.' });
    throw err;
  } finally {
    client.release();
  }
}

async function setAdminActive(req, res) {
  const { id } = req.params;
  const { isActive } = req.body;
  const { rows } = await pool.query(
    `UPDATE users u SET is_active = $1 FROM admins a WHERE a.user_id = u.id AND a.id = $2 RETURNING a.*`,
    [!!isActive, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Admin not found.' });
  await logAction({
    userId: req.user.id, role: 'super_admin',
    action: isActive ? 'ADMIN_ENABLED' : 'ADMIN_DISABLED', target: id,
  });
  res.json(rows[0]);
}

/**
 * Permanently deletes an admin account. Deletes the linked `users` row —
 * admins.user_id has ON DELETE CASCADE back to users, so this removes
 * both the login and the admin profile in one step. Students they
 * registered and results they submitted are kept (registered_by /
 * submitted_by simply become historical references), so deleting an
 * admin never deletes student data.
 */
async function deleteAdmin(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT a.user_id, u.username FROM admins a JOIN users u ON u.id = a.user_id WHERE a.id = $1`,
    [id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Admin not found.' });
  await pool.query('DELETE FROM users WHERE id = $1', [rows[0].user_id]);
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'ADMIN_DELETED', target: rows[0].username });
  res.json({ message: 'Admin account deleted.' });
}

module.exports = { listAdmins, createAdmin, setAdminActive, deleteAdmin };
