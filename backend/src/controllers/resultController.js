const { pool } = require('../config/db');
const { resolveGrade, recomputeResultTotals } = require('../utils/grading');
const { logAction } = require('../utils/audit');

const RESULT_HEADER_SELECT = `
  SELECT r.*, st.matric_number, st.first_name, st.last_name, st.photo_url,
         f.name AS faculty_name, d.name AS department_name, p.name AS programme_name,
         lv.name AS level_name, ases.name AS session_name, sem.name AS semester_name
  FROM results r
  JOIN students st ON st.id = r.student_id
  JOIN faculties f ON f.id = st.faculty_id
  JOIN departments d ON d.id = st.department_id
  JOIN programmes p ON p.id = st.programme_id
  JOIN levels lv ON lv.id = r.level_id
  JOIN academic_sessions ases ON ases.id = r.session_id
  JOIN semesters sem ON sem.id = r.semester_id
`;

async function getOrCreateDraft(req, res) {
  const { studentId, sessionId, semesterId, levelId } = req.body;
  if (!studentId || !sessionId || !semesterId || !levelId) {
    return res.status(400).json({ error: 'studentId, sessionId, semesterId and levelId are required.' });
  }

  const { rows: existing } = await pool.query(
    'SELECT * FROM results WHERE student_id = $1 AND session_id = $2 AND semester_id = $3',
    [studentId, sessionId, semesterId]
  );
  if (existing.length > 0) {
    if (existing[0].status !== 'draft' && existing[0].status !== 'rejected') {
      return res.status(409).json({ error: `A result for this student/session/semester already exists with status "${existing[0].status}".`, result: existing[0] });
    }
    return res.json(existing[0]);
  }

  const { rows } = await pool.query(
    `INSERT INTO results (student_id, session_id, semester_id, level_id, status)
     VALUES ($1,$2,$3,$4,'draft') RETURNING *`,
    [studentId, sessionId, semesterId, levelId]
  );
  await logAction({ userId: req.user.id, role: req.user.role, action: 'RESULT_DRAFT_CREATED', target: rows[0].id });
  res.status(201).json(rows[0]);
}

/**
 * Save/update a course score line within a draft (or rejected, being
 * corrected) result. Grade, grade point and quality point are always
 * computed server-side from the raw scores — never accepted as input.
 */
async function saveEntry(req, res) {
  const { resultId } = req.params;
  const { courseId, caScore, examScore } = req.body;
  if (!courseId || caScore === undefined || examScore === undefined) {
    return res.status(400).json({ error: 'courseId, caScore and examScore are required.' });
  }

  const { rows: resultRows } = await pool.query('SELECT * FROM results WHERE id = $1', [resultId]);
  const result = resultRows[0];
  if (!result) return res.status(404).json({ error: 'Result not found.' });
  // A Super Admin may also correct scores on an already-approved result,
  // as long as it hasn't been published to the student yet.
  const editableStatuses = req.user.role === 'super_admin'
    ? ['draft', 'rejected', 'approved']
    : ['draft', 'rejected'];
  if (!editableStatuses.includes(result.status)) {
    return res.status(409).json({ error: 'This result can no longer be edited.' });
  }

  const { rows: courseRows } = await pool.query('SELECT * FROM courses WHERE id = $1', [courseId]);
  if (!courseRows[0]) return res.status(404).json({ error: 'Course not found.' });

  const totalScore = Number(caScore) + Number(examScore);
  if (totalScore < 0 || totalScore > 100) {
    return res.status(400).json({ error: 'Total score must be between 0 and 100.' });
  }
  const { grade, grade_point: gradePoint, remark } = await resolveGrade(totalScore);
  const qualityPoint = Number(gradePoint) * courseRows[0].credit_unit;

  const { rows } = await pool.query(
    `INSERT INTO result_entries (result_id, course_id, ca_score, exam_score, total_score, grade, grade_point, quality_point, remark)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (result_id, course_id) DO UPDATE SET
       ca_score = EXCLUDED.ca_score, exam_score = EXCLUDED.exam_score, total_score = EXCLUDED.total_score,
       grade = EXCLUDED.grade, grade_point = EXCLUDED.grade_point, quality_point = EXCLUDED.quality_point,
       remark = EXCLUDED.remark
     RETURNING *`,
    [resultId, courseId, caScore, examScore, totalScore, grade, gradePoint, qualityPoint, remark]
  );

  const totals = await recomputeResultTotals(resultId);
  res.json({ entry: rows[0], totals });
}

async function getResultDetail(req, res) {
  const { rows: headerRows } = await pool.query(`${RESULT_HEADER_SELECT} WHERE r.id = $1`, [req.params.id]);
  const header = headerRows[0];
  if (!header) return res.status(404).json({ error: 'Result not found.' });

  const { rows: entries } = await pool.query(
    `SELECT re.*, c.code AS course_code, c.title AS course_title, c.credit_unit
     FROM result_entries re JOIN courses c ON c.id = re.course_id
     WHERE re.result_id = $1 ORDER BY c.code`,
    [req.params.id]
  );
  res.json({ ...header, entries });
}

/** List results by status, for admin's "submitted/drafts" views and Super Admin approval queue. */
async function listResults(req, res) {
  const { status } = req.query;
  const { rows } = await pool.query(
    `${RESULT_HEADER_SELECT} WHERE ($1::text IS NULL OR r.status::text = $1) ORDER BY r.updated_at DESC`,
    [status || null]
  );
  res.json(rows);
}

async function submitResult(req, res) {
  const { id } = req.params;
  const { rows: entryCheck } = await pool.query('SELECT COUNT(*)::int AS n FROM result_entries WHERE result_id = $1', [id]);
  if (entryCheck[0].n === 0) {
    return res.status(400).json({ error: 'Cannot submit a result with no course entries.' });
  }
  const { rows } = await pool.query(
    `UPDATE results SET status = 'submitted', submitted_by = $1, submitted_at = now(), rejection_reason = NULL
     WHERE id = $2 AND status IN ('draft','rejected') RETURNING *`,
    [req.user.id, id]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Only a draft or rejected result can be submitted.' });
  await logAction({ userId: req.user.id, role: req.user.role, action: 'RESULT_SUBMITTED', target: id });
  res.json(rows[0]);
}

async function approveResult(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `UPDATE results SET status = 'approved', reviewed_by = $1, reviewed_at = now()
     WHERE id = $2 AND status = 'submitted' RETURNING *`,
    [req.user.id, id]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Only a submitted result can be approved.' });
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'RESULT_APPROVED', target: id });
  res.json(rows[0]);
}

/**
 * Approves every currently-submitted result in one action. Each row is
 * updated with the same guard as single approval (status must still be
 * 'submitted'), so nothing already handled gets touched twice.
 */
async function approveAllSubmitted(req, res) {
  const { rows } = await pool.query(
    `UPDATE results SET status = 'approved', reviewed_by = $1, reviewed_at = now()
     WHERE status = 'submitted' RETURNING id`,
    [req.user.id]
  );
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'RESULTS_BULK_APPROVED', details: { count: rows.length } });
  res.json({ approved: rows.length });
}

async function rejectResult(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A rejection reason is required.' });
  }
  const { rows } = await pool.query(
    `UPDATE results SET status = 'rejected', reviewed_by = $1, reviewed_at = now(), rejection_reason = $2
     WHERE id = $3 AND status = 'submitted' RETURNING *`,
    [req.user.id, reason.trim(), id]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Only a submitted result can be rejected.' });
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'RESULT_REJECTED', target: id, details: { reason } });
  res.json(rows[0]);
}

async function publishResult(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `UPDATE results SET status = 'published', published_at = now()
     WHERE id = $1 AND status = 'approved' RETURNING *`,
    [id]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Only an approved result can be published.' });
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'RESULT_PUBLISHED', target: id });
  res.json(rows[0]);
}

/** Publishes every currently-approved result in one action. */
async function publishAllApproved(req, res) {
  const { rows } = await pool.query(
    `UPDATE results SET status = 'published', published_at = now()
     WHERE status = 'approved' RETURNING id`
  );
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'RESULTS_BULK_PUBLISHED', details: { count: rows.length } });
  res.json({ published: rows.length });
}

async function unpublishResult(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query(
    `UPDATE results SET status = 'approved', published_at = NULL WHERE id = $1 AND status = 'published' RETURNING *`,
    [id]
  );
  if (!rows[0]) return res.status(409).json({ error: 'Only a published result can be unpublished.' });
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'RESULT_UNPUBLISHED', target: id });
  res.json(rows[0]);
}

// ---------------------------------------------------------------
// STUDENT-FACING — every function below trusts ONLY req.ownStudentId,
// which the requireOwnStudentRecord middleware derived from the
// student's own authenticated session. Nothing from the URL/body/query
// is used to pick whose result is returned.
// ---------------------------------------------------------------

/** The student's current (most recent published) result. No score column. */
async function getMyCurrentResult(req, res) {
  const { rows: headerRows } = await pool.query(
    `${RESULT_HEADER_SELECT} WHERE r.student_id = $1 AND r.status = 'published'
     ORDER BY ases.name DESC, r.published_at DESC LIMIT 1`,
    [req.ownStudentId]
  );
  const header = headerRows[0];
  if (!header) return res.status(404).json({ error: 'No published result is available yet.' });

  const { rows: entries } = await pool.query(
    `SELECT c.code AS course_code, c.title AS course_title, c.credit_unit AS unit,
            re.grade, re.grade_point, re.quality_point, re.remark
     FROM result_entries re JOIN courses c ON c.id = re.course_id
     WHERE re.result_id = $1 ORDER BY c.code`,
    [header.id]
  );
  res.json({ ...header, entries });
}

/** All of the student's own published results (result history). */
async function getMyResultHistory(req, res) {
  const { rows } = await pool.query(
    `${RESULT_HEADER_SELECT} WHERE r.student_id = $1 AND r.status = 'published' ORDER BY ases.name DESC, sem.name`,
    [req.ownStudentId]
  );
  res.json(rows);
}

/**
 * A specific one of the student's own published results, selected e.g.
 * from a "First Semester / Second Semester" dropdown. Still strictly
 * scoped to req.ownStudentId — the resultId in the URL only narrows
 * which of THEIR OWN results comes back, never anyone else's.
 */
async function getMyResultById(req, res) {
  const { rows: headerRows } = await pool.query(
    `${RESULT_HEADER_SELECT} WHERE r.id = $1 AND r.student_id = $2 AND r.status = 'published'`,
    [req.params.resultId, req.ownStudentId]
  );
  const header = headerRows[0];
  if (!header) return res.status(404).json({ error: 'Result not found.' });

  const { rows: entries } = await pool.query(
    `SELECT c.code AS course_code, c.title AS course_title, c.credit_unit AS unit,
            re.grade, re.grade_point, re.quality_point, re.remark
     FROM result_entries re JOIN courses c ON c.id = re.course_id
     WHERE re.result_id = $1 ORDER BY c.code`,
    [header.id]
  );
  res.json({ ...header, entries });
}

module.exports = {
  getOrCreateDraft, saveEntry, getResultDetail, listResults,
  submitResult, approveResult, approveAllSubmitted, rejectResult,
  publishResult, publishAllApproved, unpublishResult,
  getMyCurrentResult, getMyResultHistory, getMyResultById,
};
