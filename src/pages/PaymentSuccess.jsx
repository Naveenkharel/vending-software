import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyEsewaPayment, getDispenseStatus } from '../services/esewaService';
import './PaymentSuccess.css';

const DISPENSE_LABELS = {
  queued:     { icon: '⏳', text: 'Order queued — machine is preparing…',  color: '#744210', bg: '#fefcbf' },
  dispensing: { icon: '⚙️',  text: 'Dispensing your items now!',             color: '#2b6cb0', bg: '#ebf8ff' },
  dispensed:  { icon: '✅', text: 'All items dispensed. Enjoy!',            color: '#22543d', bg: '#c6f6d5' },
  failed:     { icon: '⚠️', text: 'Dispense failed — please see staff.',    color: '#742a2a', bg: '#fed7d7' },
};

const PaymentSuccess = () => {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();

  const [stage,          setStage]          = useState('verifying');
  const [dispenseStatus, setDispenseStatus] = useState('queued');
  const [message,        setMessage]        = useState('');
  const [transactionId,  setTransactionId]  = useState('');
  const [orderItems,     setOrderItems]     = useState([]);
  const [totalAmount,    setTotalAmount]    = useState(0);
  const [debugInfo,      setDebugInfo]      = useState('');

  const pollRef = useRef(null);

  const startPolling = (orderId) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const result = await getDispenseStatus(orderId);
        if (result.success) {
          setDispenseStatus(result.status);
          if (result.status === 'dispensed' || result.status === 'failed') {
            clearInterval(pollRef.current);
          }
        }
      } catch (e) {
        console.error('Polling error:', e);
      }
    }, 3000);
  };

  useEffect(() => {
    const verify = async () => {
      const encodedData = searchParams.get('data');

      if (!encodedData) {
        setStage('failed');
        setMessage('No payment data in URL.');
        setDebugInfo('eSewa did not append ?data= to the redirect.');
        return;
      }

      let pending = {};
      try { pending = JSON.parse(sessionStorage.getItem('pendingOrder') || '{}'); } catch {}

      // Fallback: extract orderId from the encoded data if sessionStorage is empty
      let orderId = pending.orderId;
      if (!orderId) {
        try {
          const decoded = JSON.parse(atob(encodedData));
          orderId = decoded.transaction_uuid;
        } catch {}
      }

      if (!orderId) {
        setStage('failed');
        setMessage('Session expired. Please contact support.');
        return;
      }

      try {
        const result = await verifyEsewaPayment(encodedData, orderId);

        if (result.success) {
          let decoded = {};
          try { decoded = JSON.parse(atob(encodedData)); } catch {}
          setTransactionId(decoded.transaction_uuid || orderId);
          setOrderItems(pending.items      || []);
          setTotalAmount(pending.totalAmount || 0);
          sessionStorage.removeItem('pendingOrder');
          setStage('success');
          startPolling(orderId);
        } else {
          setStage('failed');
          setMessage(result.message || 'Payment verification failed.');
          setDebugInfo(JSON.stringify(result, null, 2));
        }
      } catch (err) {
        setStage('failed');
        setMessage('Could not reach verification server.');
        setDebugInfo(err.message);
      }
    };

    verify();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const dispInfo = DISPENSE_LABELS[dispenseStatus] || DISPENSE_LABELS.queued;
  const isTerminal = dispenseStatus === 'dispensed' || dispenseStatus === 'failed';

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
              {!isTerminal && (
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

            {/* Always show back button — user shouldn't be stuck */}
            <button className="result-btn" onClick={() => navigate('/')}>
              {dispenseStatus === 'dispensed' ? 'Back to Store' : 'Back to Store'}
            </button>

            {dispenseStatus === 'failed' && (
              <p style={{ color: '#742a2a', marginTop: 8, fontSize: '13px' }}>
                Please show your Transaction ID to staff for manual dispensing.
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
            {debugInfo && (
              <details style={{ marginTop: 12, textAlign: 'left' }}>
                <summary style={{ cursor: 'pointer', color: '#718096', fontSize: '13px' }}>
                  Technical details
                </summary>
                <pre style={{
                  fontSize: '11px', background: '#f7fafc', padding: '10px',
                  borderRadius: '6px', overflowX: 'auto', whiteSpace: 'pre-wrap',
                  marginTop: 8, color: '#4a5568'
                }}>{debugInfo}</pre>
              </details>
            )}
            <button className="result-btn" onClick={() => navigate('/')}>Try Again</button>
          </>
        )}

      </div>
    </div>
  );
};

export default PaymentSuccess;