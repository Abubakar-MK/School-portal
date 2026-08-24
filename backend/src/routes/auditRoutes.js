const express = require('express');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('super_admin'));

// Read-only by design — there is intentionally no PATCH/DELETE route.
// Audit logs must not be editable by any user, including Super Admin.
router.get('/', async (req, res) => {
  const { limit = 200 } = req.query;
  const { rows } = await pool.query(
    `SELECT a.*, COALESCE(ad.full_name, s.first_name || ' ' || s.last_name, u.username) AS actor_name
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.user_id
     LEFT JOIN admins ad ON ad.user_id = u.id
     LEFT JOIN students s ON s.user_id = u.id
     ORDER BY a.created_at DESC
     LIMIT $1`,
    [Math.min(Number(limit) || 200, 1000)]
  );
  res.json(rows);
});

module.exports = router;
