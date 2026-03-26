import React, { useState, useEffect } from "react";
import "./PlaceOrder.css";

const PlaceOrder = ({items, onPlaceOrder}) => {
  const [shouldRender, setShouldRender] = useState(false);
  
  const selectedItems = items.filter(item => (parseInt(item.quantity) || 0) > 0);
  
  let total = 0;
  for (let item of selectedItems) {
    total += parseInt(item.quantity) || 0;
  }
  
  useEffect(() => {
    if (selectedItems.length > 0) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedItems.length]);
  
  if (!shouldRender) {
    return null;
  }

  return (
    <div className="Place-Order-Bar">
      <div className="bar-left">
        <h3>Ready to Order</h3>
        <p className="item-paragraph">({total} items)</p>
      </div>
      
      <button
        onClick={onPlaceOrder}
        className="Place-Order-Btn"
      >
        Place Order
      </button>
    </div>
  );
};

export default PlaceOrder;