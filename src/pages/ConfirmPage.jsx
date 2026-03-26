import React, { useState, useEffect } from "react";
import "./ConfirmPage.css";

const ConfirmPage = ({ items, onConfirm, onCancel, onClose }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const selectedItems = items.filter(item => (parseInt(item.quantity) || 0) > 0);
  
  const totalPrice = selectedItems.reduce((sum, item) => {
    return sum + (item.price * (parseInt(item.quantity) || 0));
  }, 0);

  useEffect(() => {
    // When component mounts, trigger the animation
    setShouldRender(true);
    
    // Small delay to trigger CSS animation
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    return () => clearTimeout(timer);
  }, []);

  const handleProceedPayment = () => {
    if (onConfirm) {
      onConfirm(selectedItems);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Handle fade out when closing
  const handleCloseWithAnimation = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) {
        onClose();
      }
    }, 300); // Match this with CSS animation duration
  };

  const handleCancelWithAnimation = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onCancel) {
        onCancel();
      }
    }, 300);
  };

  if (!shouldRender) {
    return null;
  }

  return (
    <div className={`confirm-page-overlay ${isVisible ? 'visible' : ''}`}>
      <div className="confirm-page-container">
       
        <div className="confirm-header">
          <h2 className="confirm-title">Order Summary</h2>
          <button className="close-button" onClick={handleCloseWithAnimation}>×</button>
        </div>
        
        <div className="selected-items-section">
          <h3 className="selected-items-title">
            Selected Items 
          </h3>
          
          {selectedItems.length === 0 ? (
            <p className="no-items-message">No items selected</p>
          ) : (
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
                    <span className="item-price">${item.price.toFixed(2)}</span>
                    <span className="item-total">${itemTotal.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {selectedItems.length > 0 && (
          <div className="total-section">
            <div className="total-line grand-total">
              <span>Grand Total:</span>
              <span>${(totalPrice * 1.1).toFixed(2)}</span>
            </div>
          </div>
        )}
        
        <div className="action-buttons">
          <button 
            className="cancel-button" 
            onClick={handleCancelWithAnimation}
          >
            Back to Shopping
          </button>
          
          <button 
            className="proceed-payment-button" 
            onClick={handleProceedPayment}
            disabled={selectedItems.length === 0}
          >
            Proceed to Payment 
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmPage;