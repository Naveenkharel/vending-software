import React, { useState, useEffect } from "react";
import PaymentMethod from "./PaymentMethod";
import "./ConfirmPage.css";

const ConfirmPage = ({ items, onConfirm, onCancel, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPaymentMethod, setShowPaymentMethod] = useState(false);

  const selectedItems = items.filter(item => (parseInt(item.quantity) || 0) > 0);
  
  const totalPrice = selectedItems.reduce((sum, item) => {
    return sum + (item.price * (parseInt(item.quantity) || 0));
  }, 0);

  const grandTotal = totalPrice * 1.1;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleProceedToPayment = () => {
    setShowPaymentMethod(true);
  };

  const handlePaymentComplete = (method, amount) => {
    setShowPaymentMethod(false);
    setIsVisible(false);
    setTimeout(() => {
      if (onConfirm) {
        onConfirm(selectedItems, method, amount);
      }
    }, 300);
  };

  const handleBackFromPayment = () => {
    setShowPaymentMethod(false);
  };

  const handleCloseWithAnimation = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 300);
  };

  const handleCancelWithAnimation = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onCancel) {
        onCancel();
      }
    }, 300);
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <>
      <div className={`confirm-page-overlay ${isVisible ? 'visible' : ''}`}>
        <div className="confirm-page-container">
          <div className="confirm-header">
            <h2 className="confirm-title">Order Summary</h2>
            <button className="close-button" onClick={handleCloseWithAnimation}>×</button>
          </div>
          
          <div className="selected-items-section">
            <h3 className="selected-items-title">Selected Items</h3>
            
            <div className="items-list">
              <div className="list-header">
                <span className="header-number">#</span>
                <span className="header-item">Item Name</span>
                <span className="header-qty">Qty</span>
                <span className="header-price">Price</span>
                <span className="header-total">Total</span>
              </div>
              
              {selectedItems.map((item, index) => {
                const itemTotal = item.price * (parseInt(item.quantity) || 0);
                return (
                  <div key={item.id || index} className="item-row">
                    <span className="item-number">{index + 1}.</span>
                    <span className="item-name">{item.name}</span>
                    <span className="item-quantity">{item.quantity}</span>
                    <span className="item-price">Rs. {item.price.toFixed(2)}</span>
                    <span className="item-total">Rs. {itemTotal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="total-section">
            <div className="total-line grand-total">
              <span>Grand Total:</span>
              <span>Rs. {grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="action-buttons">
            <button className="cancel-button" onClick={handleCancelWithAnimation}>
              Back to Shopping
            </button>
            <button className="proceed-payment-button" onClick={handleProceedToPayment}>
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>

      {showPaymentMethod && (
        <PaymentMethod
          totalAmount={grandTotal}
          onPaymentComplete={handlePaymentComplete}
          onBack={handleBackFromPayment}
        />
      )}
    </>
  );
};

export default ConfirmPage;