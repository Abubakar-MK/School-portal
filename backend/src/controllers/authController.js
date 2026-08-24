const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { logAction } = require('../utils/audit');

function issueToken(user, extra = {}) {
  return jwt.sign(
    { sub: user.id, role: user.role, ...extra },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

/**
 * Staff login (Super Admin or Admin) — username + password.
 */
async function staffLogin(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const { rows } = await pool.query(
    `SELECT u.*, a.full_name, a.id AS admin_id
     FROM users u
     LEFT JOIN admins a ON a.user_id = u.id
     WHERE u.username = $1 AND u.role IN ('super_admin','admin')`,
    [username]
  );
  const user = rows[0];
  if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
    await logAction({ action: 'LOGIN_FAILED', target: username, details: { attemptedRole: 'staff' } });
    return res.status(401).json({ error: 'Invalid username or password.' });
  }

  const token = issueToken(user, { adminId: user.admin_id || null });
  await logAction({ userId: user.id, role: user.role, action: 'LOGIN_SUCCESS', target: username });

  return res.json({
    token,
    user: {
      id: user.id,
      role: user.role,
      username: user.username,
      fullName: user.full_name || null,
      mustChangePassword: user.must_change_password,
    },
  });
}

/**
 * Student login. First-ever login uses matric number + phone number
 * (their initial credential, per spec section 8) and the response
 * flags mustChangePassword so the frontend forces a reset immediately.
 * Every subsequent login uses matric number + their own chosen password.
 */
async function studentLogin(req, res) {
  const { matricNumber, password } = req.body;
  if (!matricNumber || !password) {
    return res.status(400).json({ error: 'Matriculation number and password are required.' });
  }

  const { rows } = await pool.query(
    `SELECT u.*, s.id AS student_id, s.matric_number, s.first_name, s.last_name
     FROM students s
     JOIN users u ON u.id = s.user_id
     WHERE s.matric_number = $1`,
    [matricNumber]
  );
  const record = rows[0];
  if (!record || !record.is_active || !verifyPassword(password, record.password_hash)) {
    await logAction({ action: 'LOGIN_FAILED', target: matricNumber, details: { attemptedRole: 'student' } });
    return res.status(401).json({ error: 'Invalid matriculation number or password.' });
  }

  const token = issueToken(record, { studentId: record.student_id });
  await logAction({ userId: record.id, role: 'student', action: 'LOGIN_SUCCESS', target: matricNumber });

  return res.json({
    token,
    user: {
      id: record.id,
      role: 'student',
      matricNumber: record.matric_number,
      fullName: `${record.first_name} ${record.last_name}`,
      mustChangePassword: record.must_change_password,
    },
  });
}

/**
 * Change password — works for any authenticated role. Requires the
 * current password so a hijacked but-not-fully-compromised session
 * (e.g. someone briefly at an unlocked device) can't silently lock the
 * real owner out.
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = rows[0];
  if (!verifyPassword(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect.' });
  }

  const newHash = hashPassword(newPassword);
  await pool.query(
    'UPDATE users SET password_hash = $1, must_change_password = false WHERE id = $2',
    [newHash, user.id]
  );
  await logAction({ userId: user.id, role: user.role, action: 'PASSWORD_CHANGED', target: user.id });

  return res.json({ message: 'Password updated successfully.' });
}

/** Returns the current authenticated user's profile summary. */
async function me(req, res) {
  if (req.user.role === 'student') {
    const { rows } = await pool.query(
      `SELECT s.*, f.name AS faculty_name, d.name AS department_name,
              p.name AS programme_name, l.name AS level_name
       FROM students s
       JOIN faculties f ON f.id = s.faculty_id
       JOIN departments d ON d.id = s.department_id
       JOIN programmes p ON p.id = s.programme_id
       JOIN levels l ON l.id = s.level_id
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    return res.json({ role: 'student', profile: rows[0] });
  }
  const { rows } = await pool.query(
    `SELECT u.id, u.role, u.username, a.full_name, a.email, a.phone
     FROM users u LEFT JOIN admins a ON a.user_id = u.id
     WHERE u.id = $1`,
    [req.user.id]
  );
  return res.json({ role: req.user.role, profile: rows[0] });
}

module.exports = { staffLogin, studentLogin, changePassword, me };
