const express = require('express');
const { pool } = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/** Super Admin dashboard — institution-wide counts and charts. */
router.get('/super-admin', requireRole('super_admin'), async (_req, res) => {
  const [students, admins, departments, courses, resultsByStatus, byDepartment] = await Promise.all([
    pool.query('SELECT COUNT(*)::int AS n FROM students'),
    pool.query('SELECT COUNT(*)::int AS n FROM admins'),
    pool.query('SELECT COUNT(*)::int AS n FROM departments'),
    pool.query('SELECT COUNT(*)::int AS n FROM courses'),
    pool.query('SELECT status, COUNT(*)::int AS n FROM results GROUP BY status'),
    pool.query(`SELECT d.name, COUNT(s.id)::int AS n FROM departments d
                LEFT JOIN students s ON s.department_id = d.id GROUP BY d.name ORDER BY n DESC`),
  ]);

  const statusMap = Object.fromEntries(resultsByStatus.rows.map((r) => [r.status, r.n]));

  res.json({
    totals: {
      students: students.rows[0].n,
      admins: admins.rows[0].n,
      departments: departments.rows[0].n,
      courses: courses.rows[0].n,
      draftResults: statusMap.draft || 0,
      pendingApproval: statusMap.submitted || 0,
      approvedResults: statusMap.approved || 0,
      publishedResults: statusMap.published || 0,
      rejectedResults: statusMap.rejected || 0,
    },
    studentsByDepartment: byDepartment.rows,
  });
});

/** Admin dashboard — their own workload snapshot. */
router.get('/admin', requireRole('admin', 'super_admin'), async (req, res) => {
  const [drafts, submitted, students] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS n FROM results WHERE status = 'draft' AND submitted_by IS NULL`),
    pool.query(`SELECT COUNT(*)::int AS n FROM results WHERE submitted_by = $1 AND status = 'submitted'`, [req.user.id]),
    pool.query(`SELECT COUNT(*)::int AS n FROM students WHERE registered_by = $1`, [req.user.id]),
  ]);
  res.json({
    draftResults: drafts.rows[0].n,
    mySubmittedResults: submitted.rows[0].n,
    studentsIRegistered: students.rows[0].n,
  });
});

module.exports = router;
