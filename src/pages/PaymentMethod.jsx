import React, { useState, useEffect } from 'react';
import './PaymentMethod.css';

const PaymentMethod = ({ totalAmount, onPaymentComplete, onBack }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleCloseWithAnimation = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onBack) onBack();
    }, 300);
  };

  const handlePayment = async () => {
    if (!selectedMethod) {
      alert('Please select a payment method');
      return;
    }

    setIsProcessing(true);
    
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      if (onPaymentComplete) {
        onPaymentComplete(selectedMethod, totalAmount);
      }
    }, 1500);
  };

  if (!totalAmount) return null;

  return (
    <div className={`payment-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="payment-container">
        {/* Header */}
        <div className="payment-header">
          <h2 className="payment-title">Select Payment Method</h2>
          <button className="payment-close-btn" onClick={handleCloseWithAnimation}>×</button>
        </div>

        {/* Amount Display */}
        <div className="payment-amount-section">
          <span className="payment-amount-label">Total Amount</span>
          <span className="payment-amount-value">Rs. {totalAmount.toFixed(2)}</span>
        </div>

        {/* Payment Options */}
        <div className="payment-options">
          {/* Khalti Option */}
          <div 
            className={`payment-option ${selectedMethod === 'khalti' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('khalti')}
          >
            <div className="payment-option-radio">
              <div className={`radio-circle ${selectedMethod === 'khalti' ? 'checked' : ''}`}>
                {selectedMethod === 'khalti' && <div className="radio-dot" />}
              </div>
            </div>
            <div className="payment-option-logo">
              <img 
                src="https://khaltibyime.khalti.com/wp-content/uploads/2025/07/cropped-Logo-for-Blog-1024x522.png" 
                alt="Khalti" 
                className="payment-logo-img"
              />
            </div>
            <div className="payment-option-info">
              <h3>Khalti</h3>
              <p>Pay with Khalti Wallet</p>
            </div>
          </div>

          {/* eSewa Option */}
          <div 
            className={`payment-option ${selectedMethod === 'esewa' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('esewa')}
          >
            <div className="payment-option-radio">
              <div className={`radio-circle ${selectedMethod === 'esewa' ? 'checked' : ''}`}>
                {selectedMethod === 'esewa' && <div className="radio-dot" />}
              </div>
            </div>
            <div className="payment-option-logo">
              <img 
                src="https://cdn.esewa.com.np/ui/images/logos/esewa-icon-large.png" 
                alt="eSewa" 
                className="payment-logo-img"
              />
            </div>
            <div className="payment-option-info">
              <h3>eSewa</h3>
              <p>Pay with eSewa Account</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="payment-buttons">
          <button className="payment-back-btn" onClick={handleCloseWithAnimation}>
            Back
          </button>
          <button 
            className={`payment-pay-btn ${!selectedMethod ? 'disabled' : ''}`}
            onClick={handlePayment}
            disabled={!selectedMethod || isProcessing}
          >
            {isProcessing ? (
              <>
                <div className="payment-spinner"></div>
                Processing...
              </>
            ) : (
              `Pay Rs. ${totalAmount.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethod;