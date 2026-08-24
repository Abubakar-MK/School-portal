const { pool } = require('../config/db');
const { logAction } = require('../utils/audit');

/**
 * Shared delete helper. Postgres will refuse the delete with error code
 * 23503 (foreign_key_violation) if anything still references this row
 * (e.g. a department that still has students or courses) — we turn that
 * into a friendly message instead of a raw 500 error.
 */
async function deleteRow({ table, id, req, res, action, friendlyName }) {
  try {
    const { rows } = await pool.query(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [id]);
    if (!rows[0]) return res.status(404).json({ error: `${friendlyName} not found.` });
    await logAction({ userId: req.user.id, role: req.user.role, action, target: id });
    res.json({ message: `${friendlyName} deleted.` });
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({
        error: `This ${friendlyName.toLowerCase()} is still in use (students, courses or results reference it) and cannot be deleted. Remove or reassign those first.`,
      });
    }
    throw err;
  }
}

// ---------- FACULTIES ----------
async function listFaculties(_req, res) {
  const { rows } = await pool.query('SELECT * FROM faculties ORDER BY name');
  res.json(rows);
}
async function createFaculty(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Faculty name is required.' });
  const { rows } = await pool.query(
    'INSERT INTO faculties (name) VALUES ($1) RETURNING *',
    [name]
  );
  await logAction({ userId: req.user.id, role: req.user.role, action: 'FACULTY_CREATED', target: name });
  res.status(201).json(rows[0]);
}
async function updateFaculty(req, res) {
  const { id } = req.params;
  const { name, is_active } = req.body;
  const { rows } = await pool.query(
    'UPDATE faculties SET name = COALESCE($1, name), is_active = COALESCE($2, is_active) WHERE id = $3 RETURNING *',
    [name, is_active, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Faculty not found.' });
  await logAction({ userId: req.user.id, role: req.user.role, action: 'FACULTY_UPDATED', target: id });
  res.json(rows[0]);
}
async function deleteFaculty(req, res) {
  return deleteRow({ table: 'faculties', id: req.params.id, req, res, action: 'FACULTY_DELETED', friendlyName: 'Faculty' });
}

// ---------- DEPARTMENTS ----------
async function listDepartments(req, res) {
  const { facultyId } = req.query;
  const { rows } = await pool.query(
    `SELECT d.*, f.name AS faculty_name FROM departments d
     JOIN faculties f ON f.id = d.faculty_id
     WHERE ($1::uuid IS NULL OR d.faculty_id = $1)
     ORDER BY d.name`,
    [facultyId || null]
  );
  res.json(rows);
}
async function createDepartment(req, res) {
  const { name, facultyId } = req.body;
  if (!name || !facultyId) return res.status(400).json({ error: 'Department name and facultyId are required.' });
  const { rows } = await pool.query(
    'INSERT INTO departments (name, faculty_id) VALUES ($1, $2) RETURNING *',
    [name, facultyId]
  );
  await logAction({ userId: req.user.id, role: req.user.role, action: 'DEPARTMENT_CREATED', target: name });
  res.status(201).json(rows[0]);
}
async function updateDepartment(req, res) {
  const { id } = req.params;
  const { name, is_active } = req.body;
  const { rows } = await pool.query(
    'UPDATE departments SET name = COALESCE($1, name), is_active = COALESCE($2, is_active) WHERE id = $3 RETURNING *',
    [name, is_active, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Department not found.' });
  res.json(rows[0]);
}
async function deleteDepartment(req, res) {
  return deleteRow({ table: 'departments', id: req.params.id, req, res, action: 'DEPARTMENT_DELETED', friendlyName: 'Department' });
}

// ---------- PROGRAMMES ----------
async function listProgrammes(req, res) {
  const { departmentId } = req.query;
  const { rows } = await pool.query(
    `SELECT p.*, d.name AS department_name FROM programmes p
     JOIN departments d ON d.id = p.department_id
     WHERE ($1::uuid IS NULL OR p.department_id = $1)
     ORDER BY p.name`,
    [departmentId || null]
  );
  res.json(rows);
}
async function createProgramme(req, res) {
  const { name, departmentId } = req.body;
  if (!name || !departmentId) return res.status(400).json({ error: 'Programme name and departmentId are required.' });
  const { rows } = await pool.query(
    'INSERT INTO programmes (name, department_id) VALUES ($1, $2) RETURNING *',
    [name, departmentId]
  );
  await logAction({ userId: req.user.id, role: req.user.role, action: 'PROGRAMME_CREATED', target: name });
  res.status(201).json(rows[0]);
}
async function updateProgramme(req, res) {
  const { id } = req.params;
  const { name, is_active } = req.body;
  const { rows } = await pool.query(
    'UPDATE programmes SET name = COALESCE($1, name), is_active = COALESCE($2, is_active) WHERE id = $3 RETURNING *',
    [name, is_active, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Programme not found.' });
  res.json(rows[0]);
}
async function deleteProgramme(req, res) {
  return deleteRow({ table: 'programmes', id: req.params.id, req, res, action: 'PROGRAMME_DELETED', friendlyName: 'Programme' });
}

// ---------- LEVELS ----------
async function listLevels(_req, res) {
  const { rows } = await pool.query('SELECT * FROM levels ORDER BY sort_order');
  res.json(rows);
}
async function createLevel(req, res) {
  const { name, sortOrder } = req.body;
  if (!name) return res.status(400).json({ error: 'Level name is required.' });
  const { rows } = await pool.query(
    'INSERT INTO levels (name, sort_order) VALUES ($1, $2) RETURNING *',
    [name, sortOrder || 0]
  );
  await logAction({ userId: req.user.id, role: req.user.role, action: 'LEVEL_CREATED', target: name });
  res.status(201).json(rows[0]);
}
async function deleteLevel(req, res) {
  return deleteRow({ table: 'levels', id: req.params.id, req, res, action: 'LEVEL_DELETED', friendlyName: 'Level' });
}

// ---------- ACADEMIC SESSIONS ----------
async function listSessions(_req, res) {
  const { rows } = await pool.query('SELECT * FROM academic_sessions ORDER BY name DESC');
  res.json(rows);
}
async function createSession(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Session name is required, e.g. 2026/2027.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO academic_sessions (name) VALUES ($1) RETURNING *',
      [name]
    );
    // Every session automatically gets both semesters (spec section 16).
    await client.query(
      `INSERT INTO semesters (session_id, name) VALUES ($1, 'First Semester'), ($1, 'Second Semester')`,
      [rows[0].id]
    );
    await client.query('COMMIT');
    await logAction({ userId: req.user.id, role: req.user.role, action: 'SESSION_CREATED', target: name });
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
async function setCurrentSession(req, res) {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE academic_sessions SET is_current = false');
    const { rows } = await client.query(
      'UPDATE academic_sessions SET is_current = true WHERE id = $1 RETURNING *',
      [id]
    );
    await client.query('COMMIT');
    if (!rows[0]) return res.status(404).json({ error: 'Session not found.' });
    await logAction({ userId: req.user.id, role: req.user.role, action: 'SESSION_ACTIVATED', target: id });
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
async function deleteSession(req, res) {
  // academic_sessions -> semesters cascades automatically (schema FK),
  // but students/results referencing this session will correctly block
  // deletion via the same 23503 handling as everything else.
  return deleteRow({ table: 'academic_sessions', id: req.params.id, req, res, action: 'SESSION_DELETED', friendlyName: 'Academic session' });
}

// ---------- SEMESTERS ----------
async function listSemesters(req, res) {
  const { sessionId } = req.query;
  const { rows } = await pool.query(
    `SELECT sem.*, s.name AS session_name FROM semesters sem
     JOIN academic_sessions s ON s.id = sem.session_id
     WHERE ($1::uuid IS NULL OR sem.session_id = $1)
     ORDER BY s.name DESC, sem.name`,
    [sessionId || null]
  );
  res.json(rows);
}
async function setCurrentSemester(req, res) {
  const { id } = req.params;
  const { rows: semRows } = await pool.query('SELECT session_id FROM semesters WHERE id = $1', [id]);
  if (!semRows[0]) return res.status(404).json({ error: 'Semester not found.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE semesters SET is_current = false WHERE session_id = $1', [semRows[0].session_id]);
    const { rows } = await client.query(
      'UPDATE semesters SET is_current = true WHERE id = $1 RETURNING *',
      [id]
    );
    await client.query('COMMIT');
    await logAction({ userId: req.user.id, role: req.user.role, action: 'SEMESTER_ACTIVATED', target: id });
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  listFaculties, createFaculty, updateFaculty, deleteFaculty,
  listDepartments, createDepartment, updateDepartment, deleteDepartment,
  listProgrammes, createProgramme, updateProgramme, deleteProgramme,
  listLevels, createLevel, deleteLevel,
  listSessions, createSession, setCurrentSession, deleteSession,
  listSemesters, setCurrentSemester,
};
