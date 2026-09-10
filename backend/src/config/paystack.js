// Minimal Paystack client. Uses Node's built-in `fetch` (available in
// Node 18+) so no extra package needs installing. Only the two calls
// this feature needs: start a payment, and check whether it succeeded.

const PAYSTACK_BASE = 'https://api.paystack.co';

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set in the environment.');
  return key;
}

/**
 * Starts a transaction. Paystack returns a checkout URL to send the
 * student's browser to, and its own reference we store and later use
 * to verify what actually happened.
 */
async function initializeTransaction({ email, amountKobo, reference, metadata, callbackUrl }) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, amount: amountKobo, reference, metadata, callback_url: callbackUrl }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || 'Could not start payment with Paystack.');
  }
  return data.data; // { authorization_url, access_code, reference }
}

/** Asks Paystack directly whether a given reference actually succeeded. */
async function verifyTransaction(reference) {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data.message || 'Could not verify payment with Paystack.');
  }
  return data.data; // includes .status ('success' | 'failed' | ...) and .amount
}

module.exports = { initializeTransaction, verifyTransaction };
