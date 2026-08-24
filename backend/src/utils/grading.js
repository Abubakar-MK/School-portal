const { pool } = require('../config/db');

/**
 * Look up the grade, grade point and remark for a raw total score,
 * using the configurable grading_scale table (never hard-coded so
 * Super Admin can adjust grade boundaries).
 */
async function resolveGrade(totalScore) {
  const { rows } = await pool.query(
    `SELECT grade, grade_point, remark FROM grading_scale
     WHERE $1 >= min_score AND $1 <= max_score
     LIMIT 1`,
    [totalScore]
  );
  if (rows.length === 0) {
    // Fall back to F if score somehow falls outside all configured bands
    return { grade: 'F', grade_point: 0, remark: 'Fail' };
  }
  return rows[0];
}

/**
 * Recompute total_credit_units, total_quality_points and GPA for a
 * result header, based on its result_entries. Also rolls up CGPA
 * across all of the student's previously computed results.
 * This MUST run server-side after every entry change — GPA/CGPA are
 * never accepted as client input (spec section 21).
 */
async function recomputeResultTotals(resultId, client = pool) {
  const { rows: entries } = await client.query(
    `SELECT re.total_score, re.grade, re.grade_point, re.quality_point, c.credit_unit
     FROM result_entries re
     JOIN courses c ON c.id = re.course_id
     WHERE re.result_id = $1`,
    [resultId]
  );

  let totalUnits = 0;
  let totalQualityPoints = 0;
  for (const e of entries) {
    totalUnits += c_unit(e.credit_unit);
    totalQualityPoints += Number(e.quality_point || 0);
  }
  const gpa = totalUnits > 0 ? totalQualityPoints / totalUnits : 0;

  const { rows: resultRows } = await client.query(
    `SELECT student_id, session_id, semester_id FROM results WHERE id = $1`,
    [resultId]
  );
  const { student_id } = resultRows[0];

  // CGPA = cumulative across every result this student has (published or not,
  // internal calc only reflects entered results at this point in workflow).
  const { rows: allResults } = await client.query(
    `SELECT total_credit_units, total_quality_points FROM results
     WHERE student_id = $1 AND id != $2`,
    [student_id, resultId]
  );
  let cumUnits = totalUnits;
  let cumPoints = totalQualityPoints;
  for (const r of allResults) {
    cumUnits += Number(r.total_credit_units || 0);
    cumPoints += Number(r.total_quality_points || 0);
  }
  const cgpa = cumUnits > 0 ? cumPoints / cumUnits : 0;
  const standing = academicStanding(cgpa);

  await client.query(
    `UPDATE results
     SET total_credit_units = $1, total_quality_points = $2, gpa = $3, cgpa = $4, academic_standing = $5
     WHERE id = $6`,
    [totalUnits, totalQualityPoints.toFixed(2), gpa.toFixed(2), cgpa.toFixed(2), standing, resultId]
  );

  return { totalUnits, totalQualityPoints, gpa, cgpa, standing };
}

function c_unit(n) {
  return Number(n || 0);
}

function academicStanding(cgpa) {
  if (cgpa >= 4.5) return 'GOOD STANDING';
  if (cgpa >= 3.5) return 'GOOD STANDING';
  if (cgpa >= 2.4) return 'FAIR STANDING';
  if (cgpa >= 1.5) return 'PROBATION';
  return 'WITHDRAWAL RISK';
}

module.exports = { resolveGrade, recomputeResultTotals, academicStanding };
