const { pool } = require('../config/db');
const { initializePayment: startFlutterwavePayment, verifyTransaction, verifyByReference } = require('../config/flutterwave');
const { logAction } = require('../utils/audit');

const FEE_NAIRA = Number(process.env.RESULT_VIEW_FEE_NGN || 1000);

/**
 * Student starts (or retries) a payment for ONE specific published
 * result of their own. A result can only ever have ONE row in
 * `payments` -- retrying overwrites that same row rather than adding
 * a new one, so a student's name never appears twice in the Super
 * Admin's Payments list for the same session/semester.
 *
 * Before starting a brand-new charge, this also asks Flutterwave
 * directly whether the PREVIOUS attempt (if any) actually succeeded
 * -- e.g. the student paid last time but closed the tab before the
 * redirect completed. If it did succeed, access is granted immediately
 * and no new charge is started at all.
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

  // Is there already an attempt on record for this result? If so, and
  // it genuinely succeeded on Flutterwave's side even though we never
  // heard back, pick that up now instead of charging a second time.
  const { rows: existingRows } = await pool.query('SELECT * FROM payments WHERE result_id = $1', [result.id]);
  const existing = existingRows[0];
  if (existing) {
    try {
      const priorAttempt = await verifyByReference(existing.reference);
      if (priorAttempt && priorAttempt.status === 'successful' && priorAttempt.currency === 'NGN'
          && Number(priorAttempt.amount) >= Number(existing.amount)) {
        await pool.query(
          `UPDATE payments SET status = 'success', gateway_raw = $1, verified_at = now() WHERE result_id = $2`,
          [priorAttempt, result.id]
        );
        await pool.query('UPDATE results SET access_granted = true WHERE id = $1', [result.id]);
        return res.json({ alreadyPaid: true, status: 'success' });
      }
    } catch {
      // If Flutterwave can't be reached to double-check, fall through
      // and let the student make a fresh attempt rather than blocking them.
    }
  }

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
    // One row per result: create it the first time, or overwrite the
    // existing attempt on every retry. The WHERE guard means a row
    // already marked 'success' can never be silently overwritten here
    // -- but that case is already blocked above by result.access_granted.
    await pool.query(
      `INSERT INTO payments (result_id, student_id, reference, amount, status, gateway)
       VALUES ($1,$2,$3,$4,'pending','flutterwave')
       ON CONFLICT (result_id) DO UPDATE SET
         reference = EXCLUDED.reference,
         amount = EXCLUDED.amount,
         status = 'pending',
         gateway = 'flutterwave',
         gateway_raw = NULL,
         created_at = now(),
         verified_at = NULL
       WHERE payments.status <> 'success'`,
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
 * gets independently re-verified -- the reference alone is never trusted,
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

/** Super Admin -- every payment on record, most recent first. Now at most one row per result. */
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

/** Super Admin -- manually unlocks a result regardless of payment status (e.g. a bank-transfer fix). */
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

/** Super Admin -- undoes an access grant, e.g. if it was given by mistake. */
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

/**
 * Super Admin -- permanently deletes one payment record from the list
 * (e.g. clearing out old test data or a clearly bogus attempt). Does
 * NOT touch results.access_granted either way -- deleting the payment
 * log entry is separate from whether the student can currently view
 * their result; use Grant/Revoke Access for that.
 */
async function deletePayment(req, res) {
  const { id } = req.params;
  const { rows } = await pool.query('DELETE FROM payments WHERE id = $1 RETURNING id', [id]);
  if (!rows[0]) return res.status(404).json({ error: 'Payment not found.' });
  await logAction({ userId: req.user.id, role: 'super_admin', action: 'PAYMENT_DELETED', target: id });
  res.json({ message: 'Payment record deleted.' });
}

module.exports = {
  initiatePayment, verifyPayment, listPayments, grantAccess, revokeAccess, deletePayment, FEE_NAIRA,
};
