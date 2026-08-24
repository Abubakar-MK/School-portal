const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

/**
 * requireAuth — verifies the JWT and attaches the AUTHENTICATED identity
 * to req.user. The role and ids here come ONLY from the verified token
 * (issued by the server at login), never from anything the client sends
 * in the request body/query/params. This is what every downstream
 * ownership check is built on.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Re-check the user is still active on every request — a disabled
    // admin's existing token must stop working immediately.
    const { rows } = await pool.query('SELECT id, role, is_active FROM users WHERE id = $1', [payload.sub]);
    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Account is no longer active.' });
    }

    req.user = {
      id: user.id,
      role: user.role,
      studentId: payload.studentId || null, // only present for student tokens
      adminId: payload.adminId || null,
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

/**
 * requireRole(...roles) — gates a route to specific roles. Role comes
 * from req.user, which was derived server-side in requireAuth, so a
 * client cannot forge elevated access by sending a "role" field.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

/**
 * requireOwnStudentRecord — the critical control from spec section 9.
 * Whatever student_id/matric number appears in the URL or body is
 * IGNORED for authorization purposes. A student can only ever read or
 * act on the student row tied to their own authenticated user_id.
 * Attach this to every student-facing result/profile route.
 */
async function requireOwnStudentRecord(req, res, next) {
  if (req.user.role !== 'student') {
    // Admins/Super Admins reach here through separate, explicitly
    // role-gated routes — this middleware is student-only.
    return res.status(403).json({ error: 'Not permitted.' });
  }
  try {
    const { rows } = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found.' });
    }
    // Overwrite anything the client tried to pass — this is the only
    // student_id the rest of the request is allowed to use.
    req.ownStudentId = rows[0].id;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAuth, requireRole, requireOwnStudentRecord };
