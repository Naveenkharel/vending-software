import React, { useState, useEffect } from 'react';
import './PaymentMethod.css';
import { initiateEsewaPayment, submitEsewaForm } from '../services/esewaService';

const PaymentMethod = ({ totalAmount, subtotal, taxAmount, items, onPaymentComplete, onBack }) => {
  const [isVisible,       setIsVisible]       = useState(false);
  const [selectedMethod,  setSelectedMethod]  = useState(null);
  const [isProcessing,    setIsProcessing]    = useState(false);
  const [error,           setError]           = useState('');

  useEffect(() => {
    const t = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleCloseWithAnimation = () => {
    setIsVisible(false);
    setTimeout(() => { if (onBack) onBack(); }, 300);
  };

  const handlePayment = async () => {
    if (!selectedMethod) { setError('Please select a payment method'); return; }
    setError('');
    setIsProcessing(true);

    if (selectedMethod === 'esewa') {
      try {
        // CHANGE: pass subtotal and taxAmount separately so server can store both;
        // also receive orderId back for the PaymentSuccess page to use
        const { success, paymentData, paymentUrl, orderId, message } =
          await initiateEsewaPayment(subtotal, taxAmount, items);

        if (!success) throw new Error(message || 'Could not initiate payment');

        // Store orderId in sessionStorage so PaymentSuccess can send it to server
        sessionStorage.setItem('pendingOrder', JSON.stringify({
          orderId,
          items,
          totalAmount,
          method: 'esewa',
        }));

        submitEsewaForm(paymentData, paymentUrl); // navigates away — no code runs after this
      } catch (err) {
        console.error('eSewa error:', err);
        setError(err.message || 'Payment initiation failed. Please try again.');
        setIsProcessing(false);
      }
    }
  };

  if (!totalAmount) return null;

  return (
    <div className={`payment-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="payment-container">

        <div className="payment-header">
          <h2 className="payment-title">Select Payment Method</h2>
          <button className="payment-close-btn" onClick={handleCloseWithAnimation}>×</button>
        </div>

        <div className="payment-amount-section">
          <span className="payment-amount-label">Total Amount</span>
          <span className="payment-amount-value">Rs. {parseFloat(totalAmount).toFixed(2)}</span>
        </div>

        {error && (
          <div style={{
            margin: '0 24px 16px', padding: '12px 16px',
            background: '#fff5f5', border: '1px solid #fed7d7',
            borderRadius: '8px', color: '#c53030', fontSize: '14px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <div className="payment-options">
          {/* eSewa */}
          <div
            className={`payment-option ${selectedMethod === 'esewa' ? 'selected' : ''}`}
            onClick={() => { setSelectedMethod('esewa'); setError(''); }}
          >
            <div className="payment-option-radio">
              <div className={`radio-circle ${selectedMethod === 'esewa' ? 'checked' : ''}`}>
                {selectedMethod === 'esewa' && <div className="radio-dot" />}
              </div>
            </div>
            <div className="payment-option-logo">
              <img src="https://cdn.esewa.com.np/ui/images/logos/esewa-icon-large.png" alt="eSewa" className="payment-logo-img" />
            </div>
            <div className="payment-option-info">
              <h3>eSewa</h3>
              <p>Pay with eSewa Wallet</p>
            </div>
          </div>

          {/* Khalti placeholder */}
          <div className="payment-option" style={{ opacity: 0.45, pointerEvents: 'none' }}>
            <div className="payment-option-radio"><div className="radio-circle"></div></div>
            <div className="payment-option-logo">
              <img src="https://khaltibyime.khalti.com/wp-content/uploads/2025/07/cropped-Logo-for-Blog-1024x522.png" alt="Khalti" className="payment-logo-img" />
            </div>
            <div className="payment-option-info">
              <h3>Khalti <span style={{ fontSize: '11px', color: '#a0aec0' }}>(coming soon)</span></h3>
              <p>Pay with Khalti Wallet</p>
            </div>
          </div>
        </div>

        <div className="payment-buttons">
          <button className="payment-back-btn" onClick={handleCloseWithAnimation} disabled={isProcessing}>
            Back
          </button>
          <button
            className={`payment-pay-btn ${!selectedMethod ? 'disabled' : ''}`}
            onClick={handlePayment}
            disabled={!selectedMethod || isProcessing}
          >
            {isProcessing
              ? <><div className="payment-spinner"></div> Redirecting…</>
              : `Pay Rs. ${parseFloat(totalAmount).toFixed(2)}`}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentMethod;