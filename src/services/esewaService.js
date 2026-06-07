// src/services/esewaService.js
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const initiateEsewaPayment = async (totalAmount, taxAmount = 0, items) => {
  const response = await fetch(`${API_BASE}/api/esewa/initiate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount:    parseFloat(totalAmount).toFixed(2),
      taxAmount: '0.00',   // no tax — price is MRP
      items,
    }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || 'Failed to initiate payment');
  }
  return response.json();
};

export const submitEsewaForm = (paymentData, paymentUrl) => {
  const existing = document.getElementById('esewa-payment-form');
  if (existing) existing.remove();

  const form    = document.createElement('form');
  form.id       = 'esewa-payment-form';
  form.method   = 'POST';
  form.action   = paymentUrl;
  form.style.display = 'none';

  Object.entries(paymentData).forEach(([key, value]) => {
    const input = document.createElement('input');
    input.type  = 'hidden';
    input.name  = key;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
};

export const verifyEsewaPayment = async (encodedResponse, orderId) => {
  const response = await fetch(`${API_BASE}/api/esewa/verify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encodedResponse, orderId }),
  });
  return response.json();
};

export const getDispenseStatus = async (orderId) => {
  const response = await fetch(`${API_BASE}/api/dispense/status/${orderId}`);
  return response.json();
};