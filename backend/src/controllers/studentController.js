const { pool } = require('../config/db');
const { hashPassword } = require('../utils/password');
const { logAction } = require('../utils/audit');
const { parseCsvToObjects } = require('../utils/csv');

const STUDENT_SELECT = `
  SELECT s.*, f.name AS faculty_name, d.name AS department_name,
         p.name AS programme_name, l.name AS level_name,
         ases.name AS admission_session_name
  FROM students s
  JOIN faculties f ON f.id = s.faculty_id
  JOIN departments d ON d.id = s.department_id
  JOIN programmes p ON p.id = s.programme_id
  JOIN levels l ON l.id = s.level_id
  JOIN academic_sessions ases ON ases.id = s.admission_session_id
`;

async function listStudents(req, res) {
  const { search, departmentId, programmeId, levelId, status } = req.query;
  const { rows } = await pool.query(
    `${STUDENT_SELECT}
     WHERE ($1::text IS NULL OR s.matric_number ILIKE $1 OR (s.first_name || ' ' || s.last_name) ILIKE $1 OR s.phone ILIKE $1)
       AND ($2::uuid IS NULL OR s.department_id = $2)
       AND ($3::uuid IS NULL OR s.programme_id = $3)
       AND ($4::uuid IS NULL OR s.level_id = $4)
       AND ($5::text IS NULL OR s.status::text = $5)
     ORDER BY s.created_at DESC`,
    [search ? `%${search}%` : null, departmentId || null, programmeId || null, levelId || null, status || null]
  );
  res.json(rows);
}

async function getStudent(req, res) {
  const { rows } = await pool.query(`${STUDENT_SELECT} WHERE s.id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Student not found.' });
  res.json(rows[0]);
}

/**
 * Register a new student. Creates BOTH the users row (login identity)
 * and the students row (profile), atomically. Initial password is the
 * phone number (per spec section 8) and must_change_password is set so
 * the very first login forces a reset.
 */
async function registerStudent(req, res) {
  const {
    matricNumber, firstName, middleName, lastName, gender, dateOfBirth,
    phone, email, facultyId, departmentId, programmeId, levelId,
    admissionSessionId, admissionYear,
  } = req.body;

  if (!matricNumber || !firstName || !lastName || !phone || !facultyId || !departmentId || !programmeId || !levelId || !admissionSessionId) {
    return res.status(400).json({ error: 'Missing required student fields.' });
  }
  if (!/^\+?[0-9]{7,15}$/.test(phone.replace(/\s/g, ''))) {
    return res.status(400).json({ error: 'Please provide a valid phone number.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existing } = await client.query('SELECT id FROM students WHERE matric_number = $1', [matricNumber]);
    if (existing.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A student with this matriculation number already exists.' });
    }

    const passwordHash = hashPassword(phone.trim());
    const { rows: userRows } = await client.query(
      `INSERT INTO users (role, password_hash, must_change_password) VALUES ('student', $1, true) RETURNING id`,
      [passwordHash]
    );
    const userId = userRows[0].id;

    const photoUrl = req.file ? `/uploads/students/${req.file.filename}` : null;

    const { rows: studentRows } = await client.query(
      `INSERT INTO students (
        user_id, matric_number, first_name, middle_name, last_name, gender, date_of_birth,
        phone, email, faculty_id, department_id, programme_id, level_id,
        admission_session_id, admission_year, photo_url, registered_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      RETURNING *`,
      [userId, matricNumber.trim(), firstName, middleName || null, lastName, gender || null, dateOfBirth || null,
       phone.trim(), email || null, facultyId, departmentId, programmeId, levelId,
       admissionSessionId, admissionYear || null, photoUrl, req.user.id]
    );

    await client.query('COMMIT');
    await logAction({
      userId: req.user.id, role: req.user.role, action: 'STUDENT_REGISTERED',
      target: matricNumber, details: { studentId: studentRows[0].id },
    });

    return res.status(201).json({
      student: studentRows[0],
      note: 'Initial login password is the student\'s phone number. They will be required to change it on first login.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateStudent(req, res) {
  const { id } = req.params;
  const allowed = ['first_name', 'middle_name', 'last_name', 'gender', 'date_of_birth', 'phone', 'email', 'status',
                    'faculty_id', 'department_id', 'programme_id', 'level_id'];
  const fields = [];
  const values = [];
  let i = 1;
  for (const key of allowed) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (req.body[camel] !== undefined) {
      fields.push(`${key} = $${i}`);
      values.push(req.body[camel]);
      i += 1;
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No valid fields to update.' });
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE students SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );
  if (!rows[0]) return res.status(404).json({ error: 'Student not found.' });
  await logAction({ userId: req.user.id, role: req.user.role, action: 'STUDENT_UPDATED', target: id });
  res.json(rows[0]);
}

/** Admin/Super Admin uploads or replaces a student's official photo. */
async function uploadPhoto(req, res) {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });
  const photoUrl = `/uploads/students/${req.file.filename}`;
  const { rows } = await pool.query(
    'UPDATE students SET photo_url = $1 WHERE id = $2 RETURNING *',
    [photoUrl, id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Student not found.' });
  await logAction({ userId: req.user.id, role: req.user.role, action: 'STUDENT_PHOTO_UPDATED', target: id });
  res.json(rows[0]);
}

/** Super Admin can reset a student's password back to their phone number. */
async function resetStudentPassword(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT phone, user_id FROM students WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Student not found.' });
  const newHash = hashPassword(rows[0].phone);
  await pool.query(
    'UPDATE users SET password_hash = $1, must_change_password = true WHERE id = $2',
    [newHash, rows[0].user_id]
  );
  await logAction({ userId: req.user.id, role: req.user.role, action: 'STUDENT_PASSWORD_RESET', target: id });
  res.json({ message: 'Password has been reset to the student\'s phone number. They must change it at next login.' });
}

/**
 * Permanently deletes a student. We delete the linked `users` row rather
 * than the `students` row directly — students.user_id has ON DELETE
 * CASCADE back to users, and results.student_id has ON DELETE CASCADE
 * back to students, so this one delete cleanly removes the student's
 * login, profile and every result of theirs in one transaction-safe step.
 */
async function deleteStudent(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('SELECT user_id, matric_number FROM students WHERE id = $1', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Student not found.' });
  await pool.query('DELETE FROM users WHERE id = $1', [rows[0].user_id]);
  await logAction({ userId: req.user.id, role: req.user.role, action: 'STUDENT_DELETED', target: rows[0].matric_number });
  res.json({ message: 'Student record deleted.' });
}

/**
 * Bulk-registers students from an uploaded CSV (see the downloadable
 * template on the frontend for exact column names). Every row runs
 * through the same validation as single registration — unique matric
 * number, valid phone, resolvable academic structure — and each row
 * succeeds or fails independently so one bad row doesn't block the rest.
 */
async function bulkRegisterStudents(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded.' });

  const text = req.file.buffer.toString('utf8');
  const records = parseCsvToObjects(text);
  if (records.length === 0) {
    return res.status(400).json({ error: 'The CSV file appears to be empty.' });
  }

  const [faculties, departments, programmes, levels, sessions] = await Promise.all([
    pool.query('SELECT id, name FROM faculties'),
    pool.query('SELECT id, name, faculty_id FROM departments'),
    pool.query('SELECT id, name, department_id FROM programmes'),
    pool.query('SELECT id, name FROM levels'),
    pool.query('SELECT id, name FROM academic_sessions'),
  ]);
  const findByName = (list, name) =>
    list.find((r) => r.name.trim().toLowerCase() === String(name || '').trim().toLowerCase());

  const results = [];
  let successCount = 0;

  for (let i = 0; i < records.length; i += 1) {
    const rowNum = i + 2; // header is row 1
    const r = records[i];
    const matricNumber = r.matricNumber || r['Matric Number'] || '';
    const firstName = r.firstName || r['First Name'] || '';
    const lastName = r.lastName || r['Last Name'] || '';
    const phone = r.phone || r['Phone'] || '';

    try {
      if (!matricNumber || !firstName || !lastName || !phone) {
        throw new Error('Missing required field(s): matricNumber, firstName, lastName, phone.');
      }
      if (!/^\+?[0-9]{7,15}$/.test(phone.replace(/\s/g, ''))) {
        throw new Error('Invalid phone number.');
      }

      const faculty = findByName(faculties.rows, r.faculty || r['Faculty']);
      const department = findByName(departments.rows, r.department || r['Department']);
      const programme = findByName(programmes.rows, r.programme || r['Programme']);
      const level = findByName(levels.rows, r.level || r['Level']);
      const session = findByName(sessions.rows, r.admissionSession || r['Admission Session']);

      if (!faculty) throw new Error(`Faculty "${r.faculty || r['Faculty']}" not found.`);
      if (!department) throw new Error(`Department "${r.department || r['Department']}" not found.`);
      if (!programme) throw new Error(`Programme "${r.programme || r['Programme']}" not found.`);
      if (!level) throw new Error(`Level "${r.level || r['Level']}" not found.`);
      if (!session) throw new Error(`Academic session "${r.admissionSession || r['Admission Session']}" not found.`);

      const { rows: existing } = await pool.query('SELECT id FROM students WHERE matric_number = $1', [matricNumber]);
      if (existing.length > 0) throw new Error('A student with this matriculation number already exists.');

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const passwordHash = hashPassword(phone.trim());
        const { rows: userRows } = await client.query(
          `INSERT INTO users (role, password_hash, must_change_password) VALUES ('student', $1, true) RETURNING id`,
          [passwordHash]
        );
        await client.query(
          `INSERT INTO students (
            user_id, matric_number, first_name, middle_name, last_name, gender, date_of_birth,
            phone, email, faculty_id, department_id, programme_id, level_id,
            admission_session_id, admission_year, registered_by
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
          [userRows[0].id, matricNumber.trim(), firstName, r.middleName || r['Middle Name'] || null, lastName,
           r.gender || r['Gender'] || null, r.dateOfBirth || r['Date of Birth'] || null,
           phone.trim(), r.email || r['Email'] || null, faculty.id, department.id, programme.id, level.id,
           session.id, r.admissionYear || r['Admission Year'] || null, req.user.id]
        );
        await client.query('COMMIT');
      } catch (innerErr) {
        await client.query('ROLLBACK');
        throw innerErr;
      } finally {
        client.release();
      }

      successCount += 1;
      results.push({ row: rowNum, matricNumber, status: 'success' });
    } catch (err) {
      results.push({ row: rowNum, matricNumber: matricNumber || '(missing)', status: 'failed', error: err.message });
    }
  }

  await logAction({
    userId: req.user.id, role: req.user.role, action: 'STUDENTS_BULK_UPLOADED',
    target: req.file.originalname, details: { total: records.length, succeeded: successCount },
  });

  res.status(207).json({
    total: records.length,
    succeeded: successCount,
    failed: records.length - successCount,
    results,
  });
}

module.exports = {
  listStudents, getStudent, registerStudent, updateStudent, uploadPhoto,
  resetStudentPassword, deleteStudent, bulkRegisterStudents,
};
