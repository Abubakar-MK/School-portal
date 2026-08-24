const { pool } = require('../config/db');
const { logAction } = require('../utils/audit');

async function listCourses(req, res) {
  const { programmeId, levelId, semester } = req.query;
  const { rows } = await pool.query(
    `SELECT c.*, p.name AS programme_name, l.name AS level_name, d.name AS department_name
     FROM courses c
     JOIN programmes p ON p.id = c.programme_id
     JOIN levels l ON l.id = c.level_id
     JOIN departments d ON d.id = c.department_id
     WHERE ($1::uuid IS NULL OR c.programme_id = $1)
       AND ($2::uuid IS NULL OR c.level_id = $2)
       AND ($3::text IS NULL OR c.semester::text = $3)
     ORDER BY c.code`,
    [programmeId || null, levelId || null, semester || null]
  );
  res.json(rows);
}

async function createCourse(req, res) {
  const { code, title, creditUnit, departmentId, programmeId, levelId, semester } = req.body;
  if (!code || !title || !creditUnit || !departmentId || !programmeId || !levelId || !semester) {
    return res.status(400).json({ error: 'All course fields are required.' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO courses (code, title, credit_unit, department_id, programme_id, level_id, semester)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [code.toUpperCase().trim(), title, creditUnit, departmentId, programmeId, levelId, semester]
    );
    await logAction({ userId: req.user.id, role: req.user.role, action: 'COURSE_CREATED', target: code });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'This course code already exists for the selected programme, level and semester.' });
    }
    throw err;
  }
}

async function updateCourse(req, res) {
  const { id } = req.params;
  const { title, creditUnit, isActive } = req.body;
  const { rows } = await pool.query(
    `UPDATE courses SET title = COALESCE($1, title), credit_unit = COALESCE($2, credit_unit),
     is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *`,
    [title, creditUnit, isActive, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Course not found.' });
  await logAction({ userId: req.user.id, role: req.user.role, action: 'COURSE_UPDATED', target: id });
  res.json(rows[0]);
}

async function deleteCourse(req, res) {
  const { id } = req.params;
  try {
    const { rows } = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING code', [id]);
    if (!rows[0]) return res.status(404).json({ error: 'Course not found.' });
    await logAction({ userId: req.user.id, role: req.user.role, action: 'COURSE_DELETED', target: rows[0].code });
    res.json({ message: 'Course deleted.' });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'This course cannot be deleted because it already has result scores recorded against it.' });
    }
    throw err;
  }
}

module.exports = { listCourses, createCourse, updateCourse, deleteCourse };
