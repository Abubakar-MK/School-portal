// Minimal Flutterwave client. Uses Node's built-in `fetch` (Node 18+)
// so no extra package needs installing.

const FLW_BASE = 'https://api.flutterwave.com/v3';

function secretKey() {
  const key = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!key) throw new Error('FLUTTERWAVE_SECRET_KEY is not set in the environment.');
  return key;
}

/**
 * Starts a transaction. Flutterwave returns a checkout link to send
 * the student's browser to. `txRef` is OUR OWN reference (we generate
 * it) -- Flutterwave also assigns its own numeric transaction_id once
 * payment happens, which is what verification actually keys off.
 */
async function initializePayment({ email, name, amountNaira, txRef, redirectUrl, meta }) {
  const res = await fetch(`${FLW_BASE}/payments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: amountNaira,
      currency: 'NGN',
      redirect_url: redirectUrl,
      customer: { email, name },
      meta,
    }),
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || 'Could not start payment with Flutterwave.');
  }
  return data.data; // { link }
}

/**
 * Independently asks Flutterwave whether a given transaction_id (the
 * one Flutterwave itself assigned, returned on the redirect) actually
 * succeeded. Never trust the redirect's own "status" query param alone
 * -- always re-check here before granting access.
 */
async function verifyTransaction(transactionId) {
  const res = await fetch(`${FLW_BASE}/transactions/${encodeURIComponent(transactionId)}/verify`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') {
    throw new Error(data.message || 'Could not verify payment with Flutterwave.');
  }
  return data.data;
}

/**
 * Checks whether OUR OWN reference (the tx_ref we generated, before
 * we necessarily know Flutterwave's transaction_id for it) already
 * succeeded. Used when a student clicks "Pay" again on an old pending
 * attempt -- e.g. they actually paid last time but closed the tab
 * before the redirect completed -- so a real earlier payment can be
 * picked up instead of silently starting a brand-new charge.
 * Returns null if Flutterwave has no record of that reference at all
 * (a genuinely fresh/never-attempted reference), rather than throwing,
 * since "not found" is an expected, normal outcome here.
 */
async function verifyByReference(txRef) {
  const res = await fetch(`${FLW_BASE}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = await res.json();
  if (!res.ok || data.status !== 'success') return null;
  return data.data;
}

module.exports = { initializePayment, verifyTransaction, verifyByReference };
