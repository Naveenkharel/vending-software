// src/pages/PaymentFailure.jsx
// eSewa redirects here if the user cancels or payment fails
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './PaymentSuccess.css'; // reuse same styles

const PaymentFailure = () => {
  const navigate = useNavigate();
  return (
    <div className="payment-result-page">
      <div className="payment-result-card failed">
        <div className="result-icon fail-icon">✕</div>
        <h2>Payment Cancelled</h2>
        <p>Your payment was not completed. You have not been charged.</p>
        <button className="result-btn" onClick={() => navigate('/')}>Back to Store</button>
      </div>
    </div>
  );
};

export default PaymentFailure;