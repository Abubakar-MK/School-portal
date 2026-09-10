import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';

/**
 * Paystack sends the student's browser back here after checkout. This
 * page never trusts the redirect by itself — it asks the backend to
 * independently re-verify the reference with Paystack before treating
 * the payment as real, then sends the student back to their results.
 */
export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | success | failed | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Flutterwave redirects back with its own set of query params:
    // status ('successful' | 'cancelled' | ...), tx_ref (our reference),
    // and transaction_id (Flutterwave's own id, needed to re-verify).
    const flwStatus = searchParams.get('status');
    const reference = searchParams.get('tx_ref');
    const transactionId = searchParams.get('transaction_id');

    if (flwStatus === 'cancelled') {
      setStatus('failed');
      return;
    }
    if (!reference || !transactionId) {
      setStatus('error');
      setMessage('The payment redirect was missing required information.');
      return;
    }
    api.get(`/payments/verify/${reference}`, { params: { transactionId } })
      .then(({ data }) => {
        setStatus(data.status === 'success' ? 'success' : 'failed');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Could not verify your payment.');
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-8 text-center">
        {status === 'checking' && (
          <>
            <div className="animate-spin h-10 w-10 border-4 border-maroon border-t-transparent rounded-full mx-auto mb-4" />
            <p className="font-semibold text-gray-700">Confirming your payment…</p>
            <p className="text-xs text-gray-500 mt-1">Please don\u2019t close this page.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-green-600 text-4xl mb-3">✓</div>
            <p className="font-bold text-gray-800 mb-1">Payment successful</p>
            <p className="text-sm text-gray-500 mb-5">Your result is now unlocked.</p>
            <button onClick={() => navigate('/student/current-result')} className="bg-maroon text-white px-5 py-2 rounded font-semibold text-sm">
              View My Result
            </button>
          </>
        )}
        {status === 'failed' && (
          <>
            <div className="text-red-600 text-4xl mb-3">✕</div>
            <p className="font-bold text-gray-800 mb-1">Payment was not successful</p>
            <p className="text-sm text-gray-500 mb-5">No charge was applied. You can try again.</p>
            <button onClick={() => navigate('/student/current-result')} className="bg-maroon text-white px-5 py-2 rounded font-semibold text-sm">
              Try Again
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-600 text-4xl mb-3">!</div>
            <p className="font-bold text-gray-800 mb-1">Something went wrong</p>
            <p className="text-sm text-gray-500 mb-5">{message}</p>
            <button onClick={() => navigate('/student/current-result')} className="bg-maroon text-white px-5 py-2 rounded font-semibold text-sm">
              Back to My Results
            </button>
          </>
        )}
      </div>
    </div>
  );
}
