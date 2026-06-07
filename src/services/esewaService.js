// src/services/esewaService.js

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Step 1 — Ask the server to sign the payment and create a pending order in Firestore.
 * Returns { success, paymentData, paymentUrl, orderId }
 *
 * CHANGE: now also receives `orderId` back from the server so
 * PaymentSuccess can look up the right order for verification.
 */
export const initiateEsewaPayment = async (totalAmount, taxAmount = 0, items) => {
  const response = await fetch(`${API_BASE}/api/esewa/initiate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount:    parseFloat(totalAmount).toFixed(2),
      taxAmount: parseFloat(taxAmount).toFixed(2),
      items,
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to initiate payment');
  }
  return response.json();
};

/**
 * Step 2 — Submit the signed form to eSewa.
 * This is a real HTML form POST — not fetch. It navigates the browser to eSewa.
 */
export const submitEsewaForm = (paymentData, paymentUrl) => {
  const existing = document.getElementById('esewa-payment-form');
  if (existing) existing.remove();

  const form    = document.createElement('form');
  form.id       = 'esewa-payment-form';
  form.method   = 'POST';
  form.action   = paymentUrl;
  form.style.display = 'none';

  Object.entries(paymentData).forEach(([key, value]) => {
    const input  = document.createElement('input');
    input.type   = 'hidden';
    input.name   = key;
    input.value  = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

/**
 * Step 3 — Verify the payment after redirect.
 * CHANGE: now sends orderId alongside the encoded response so the server
 * can do an idempotency check (won't double-process a payment).
 */
export const verifyEsewaPayment = async (encodedResponse, orderId) => {
  const response = await fetch(`${API_BASE}/api/esewa/verify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encodedResponse, orderId }),
  });
  return response.json();
};

/**
 * Poll the dispense status for a given order.
 * PaymentSuccess calls this repeatedly until status is "dispensed" or "failed".
 */
export const getDispenseStatus = async (orderId) => {
  const response = await fetch(`${API_BASE}/api/dispense/status/${orderId}`);
  return response.json();
};