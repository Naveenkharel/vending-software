// src/pages/PaymentSuccess.jsx
// eSewa redirects here with ?data=<base64> after payment completes
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEsewaPayment, getDispenseStatus } from '../services/esewaService';
import './PaymentSuccess.css';

// ── Dispense status display ──
const DISPENSE_LABELS = {
  queued:      { icon: '⏳', text: 'Order queued — machine is preparing…',   color: '#744210', bg: '#fefcbf' },
  dispensing:  { icon: '⚙️',  text: 'Dispensing your items now!',              color: '#2b6cb0', bg: '#ebf8ff' },
  dispensed:   { icon: '✅', text: 'Your items have been dispensed. Enjoy!',  color: '#22543d', bg: '#c6f6d5' },
  failed:      { icon: '⚠️', text: 'Dispense failed — please see staff.',     color: '#742a2a', bg: '#fed7d7' },
};

const PaymentSuccess = () => {
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();

  const [stage,          setStage]          = useState('verifying'); // verifying | success | failed
  const [dispenseStatus, setDispenseStatus] = useState('queued');
  const [message,        setMessage]        = useState('');
  const [transactionId,  setTransactionId]  = useState('');
  const [orderItems,     setOrderItems]     = useState([]);
  const [totalAmount,    setTotalAmount]    = useState(0);

  const pollRef = useRef(null);

  // ── Start polling dispense status after payment is verified ──
  const startPolling = (orderId) => {
    // Clear any previous interval
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const result = await getDispenseStatus(orderId);
        if (result.success) {
          setDispenseStatus(result.status);
          // Stop polling once we reach a terminal state
          if (result.status === 'dispensed' || result.status === 'failed') {
            clearInterval(pollRef.current);
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000); // Poll every 3 seconds
  };

  useEffect(() => {
    const verify = async () => {
      const encodedData = searchParams.get('data');
      if (!encodedData) {
        setStage('failed');
        setMessage('No payment data received. Please contact support.');
        return;
      }

      // Retrieve orderId we stored before redirecting to eSewa
      const pending = JSON.parse(sessionStorage.getItem('pendingOrder') || '{}');
      const orderId = pending.orderId;

      if (!orderId) {
        setStage('failed');
        setMessage('Session expired. Please contact support with your transaction details.');
        return;
      }

      try {
        // Send BOTH the encoded response AND orderId to the server
        const result = await verifyEsewaPayment(encodedData, orderId);

        if (result.success) {
          const decoded = JSON.parse(atob(encodedData));
          setTransactionId(decoded.transaction_uuid || orderId);
          setOrderItems(pending.items   || []);
          setTotalAmount(pending.totalAmount || 0);
          sessionStorage.removeItem('pendingOrder');
          setStage('success');
          setMessage('Payment verified! Your order is being dispensed.');
          // Start polling the dispense_queue for this order
          startPolling(orderId);
        } else {
          setStage('failed');
          setMessage(result.message || 'Payment verification failed.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStage('failed');
        setMessage('Could not verify payment. Please contact support.');
      }
    };

    verify();
    // Cleanup polling on unmount
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const dispInfo = DISPENSE_LABELS[dispenseStatus] || DISPENSE_LABELS.queued;

  return (
    <div className="payment-result-page">
      <div className={`payment-result-card ${stage}`}>

        {/* ── Verifying ── */}
        {stage === 'verifying' && (
          <>
            <div className="result-spinner"></div>
            <h2>Verifying Payment…</h2>
            <p>Please wait. Do not close this page.</p>
          </>
        )}

        {/* ── Success ── */}
        {stage === 'success' && (
          <>
            <div className="result-icon success-icon">✓</div>
            <h2>Payment Successful!</h2>

            {transactionId && (
              <p className="txn-id">Txn ID: <strong>{transactionId}</strong></p>
            )}

            {/* Dispense status banner */}
            <div className="dispense-banner" style={{ background: dispInfo.bg, color: dispInfo.color }}>
              <span className="dispense-icon">{dispInfo.icon}</span>
              <span>{dispInfo.text}</span>
              {(dispenseStatus === 'queued' || dispenseStatus === 'dispensing') && (
                <div className="dispense-spinner" style={{ borderTopColor: dispInfo.color }}></div>
              )}
            </div>

            {/* Order summary */}
            {orderItems.length > 0 && (
              <div className="order-summary-box">
                <h4>Your Order</h4>
                {orderItems.map((item, i) => (
                  <div key={i} className="order-summary-row">
                    <span>{item.name} × {item.quantity}</span>
                    <span>Rs. {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="order-summary-total">
                  <span>Total Paid</span>
                  <span>Rs. {parseFloat(totalAmount).toFixed(2)}</span>
                </div>
              </div>
            )}

            {dispenseStatus === 'dispensed' && (
              <button className="result-btn" onClick={() => navigate('/')}>Back to Store</button>
            )}
            {dispenseStatus === 'failed' && (
              <p style={{ color: '#742a2a', marginTop: 8 }}>
                Please show your Transaction ID to the staff.
              </p>
            )}
          </>
        )}

        {/* ── Failed ── */}
        {stage === 'failed' && (
          <>
            <div className="result-icon fail-icon">✕</div>
            <h2>Payment Failed</h2>
            <p>{message}</p>
            <button className="result-btn" onClick={() => navigate('/')}>Try Again</button>
          </>
        )}

      </div>
    </div>
  );
};

export default PaymentSuccess;