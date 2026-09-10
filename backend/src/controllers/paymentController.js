const { pool } = require('../config/db');
const { initializePayment: startFlutterwavePayment, verifyTransaction } = require('../config/flutterwave');
const { logAction } = require('../utils/audit');

const FEE_NAIRA = Number(process.env.RESULT_VIEW_FEE_NGN || 1200);

/**
 * Student starts a payment to unlock ONE specific published result of
 * their own. Ownership is derived only from req.user.studentId (the
 * verified token), never from anything the client sends — the same
 * rule every other student-facing endpoint follows.
 */
async function initiatePayment(req, res) {
  if (!req.user.studentId) return res.status(403).json({ error: 'Student account required.' });
  const { resultId, callbackUrl } = req.body;

  const { rows } = await pool.query(
    `SELECT r.*, s.email, s.first_name, s.last_name, s.matric_number
     FROM results r JOIN students s ON s.id = r.student_id
     WHERE r.id = $1 AND r.student_id = $2`,
    [resultId, req.user.studentId]
  );
  const result = rows[0];
  if (!result) return res.status(404).json({ error: 'Result not found.' });
  if (result.status !== 'published') return res.status(409).json({ error: 'This result has not been published yet.' });
  if (result.access_granted) return res.status(409).json({ error: 'You already have access to this result.' });
  if (!result.email) return res.status(400).json({ error: 'No email on file for your account \u2014 contact the school to add one before paying.' });

  const txRef = `HGCM-${result.id.slice(0, 8)}-${Date.now()}`;
  try {
    const tx = await startFlutterwavePayment({
      email: result.email,
      name: `${result.first_name} ${result.last_name}`,
      amountNaira: FEE_NAIRA,
      txRef,
      redirectUrl: callbackUrl,
      meta: {
        resultId: result.id,
        matric: result.matric_number,
      },
    });
    await pool.query(
      `INSERT INTO payments (result_id, student_id, reference, amount, status, gateway)
       VALUES ($1,$2,$3,$4,'pending','flutterwave')`,
      [result.id, req.user.studentId, txRef, FEE_NAIRA]
    );
    res.json({ authorizationUrl: tx.link, reference: txRef, amount: FEE_NAIRA });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not start payment.' });
  }
}

/**
 * Called once the student returns from Flutterwave's checkout page.
 * Flutterwave's own transaction_id (from the redirect) is what actually
 * gets independently re-verified — the reference alone is never trusted,
 * and the verified transaction's own tx_ref, amount, and currency are
 * all cross-checked against what we expected before granting access.
 */
async function verifyPayment(req, res) {
  const { reference } = req.params;
  const { transactionId } = req.query;
  const { rows } = await pool.query('SELECT * FROM payments WHERE reference = $1', [reference]);
  const payment = rows[0];
  if (!payment) return res.status(404).json({ error: 'Payment not found.' });
  if (req.user.role === 'student' && payment.student_id !== req.user.studentId) {
    return res.status(403).json({ error: 'Not your payment.' });
  }
  if (!transactionId) return res.status(400).json({ error: 'Missing transaction ID from the payment redirect.' });

  try {
    const tx = await verifyTransaction(transactionId);
    const matches = tx.tx_ref === reference && tx.currency === 'NGN' && Number(tx.amount) >= Number(payment.amount);
    const status = (tx.status === 'successful' && matches) ? 'success' : 'failed';
    await pool.query(
      `UPDATE payments SET status = $1, gateway_raw = $2, verified_at = now() WHERE reference = $3`,
      [status, tx, reference]
    );
    if (status === 'success') {
      await pool.query('UPDATE results SET access_granted = true WHERE id = $1', [payment.result_id]);
    }
    res.json({ status });
  } catch (err) {
    res.status(502).json({ error: err.message || 'Could not verify payment.' });
  }
}

/** Super Admin — every payment attempt across the school, most recent first. */
async function listPayments(req, res) {
  const { status } = req.query;
  const { rows } = await pool.query(
    `SELECT p.*, st.matric_number, st.first_name, st.last_name,
            ases.name AS session_name, sem.name AS semester_name, r.access_granted
     FROM payments p
     JOIN students st ON st.id = p.student_id
     JOIN results r ON r.id = p.result_id
     JOIN academic_sessions ases ON ases.id = r.session_id
     JOIN semesters sem ON sem.id = r.semester_id
     WHERE ($1::text IS NULL OR p.status = $1)
     ORDER BY p.created_at DESC`,
    [status || null]
  );
  res.json(rows);
}

/** Super Admin — manually unlocks a result regardless of payment status (e.g. a bank-transfer fix). */
async function grantAccess(req, res) {
  const { resultId } = req.params;
  const { rows } = await pool.query(
    `UPDATE results SET access_granted = true WHERE id = $1 RETURNING id`,
    [resultId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Result not found.' });
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'RESULT_ACCESS_GRANTED', target: resultId });
  res.json({ message: 'Access granted.' });
}

/** Super Admin — undoes an access grant, e.g. if it was given by mistake. */
async function revokeAccess(req, res) {
  const { resultId } = req.params;
  const { rows } = await pool.query(
    `UPDATE results SET access_granted = false WHERE id = $1 RETURNING id`,
    [resultId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Result not found.' });
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'RESULT_ACCESS_REVOKED', target: resultId });
  res.json({ message: 'Access revoked.' });
}

module.exports = { initiatePayment, verifyPayment, listPayments, grantAccess, revokeAccess, FEE_NAIRA };
