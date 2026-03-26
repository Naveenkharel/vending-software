import React, { useState, useEffect } from 'react';
import './UserHome.css';
import PlaceOrder from '../Components/PlaceOrder';
import ConfirmPage from './ConfirmPage';
import { getAllInventory } from '../../backend/SeedData/InventoryService';

const UserHome = () => {
  // items now comes from Firebase; start empty while loading
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmPage, setShowConfirmPage] = useState(false);

  // ── CHANGED: load real inventory from Firebase on mount ──
  useEffect(() => {
    const loadInventory = async () => {
      try {
        setLoading(true);
        const inventory = await getAllInventory();

        // Only show slots that have a name (admin has stocked them)
        const stockedItems = inventory
          .filter(item => item.name && item.quantity > 0)
          .map(item => ({
            id: item.id,
            slot: item.slot,
            name: item.name,
            price: parseFloat(item.price) || 0,
            availableQuantity: parseInt(item.quantity) || 0,  // max the user can pick
            quantity: 0,   // how many the user has selected (starts at 0)
            image: item.imageUrl || '',
            description: item.description || ''
          }));

        setItems(stockedItems);
      } catch (error) {
        console.error('Error loading inventory:', error);
        alert('Could not load products. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadInventory();
  }, []);

  // ── CHANGED: increment capped at availableQuantity ──
  const handleIncrement = (id) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const current = parseInt(item.quantity) || 0;
      if (current >= item.availableQuantity) return item; // can't exceed stock
      return { ...item, quantity: current + 1 };
    }));
  };

  const handleDecrement = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, quantity: Math.max(0, (parseInt(item.quantity) || 0) - 1) }
        : item
    ));
  };

  // ── CHANGED: manual input also capped at availableQuantity ──
  const handleInputChange = (id, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (value === '') return { ...item, quantity: '' };
      const numValue = parseInt(value);
      if (isNaN(numValue) || numValue < 0) return item;
      // Clamp to available stock
      return { ...item, quantity: Math.min(numValue, item.availableQuantity) };
    }));
  };

  const handlePlaceOrder = () => {
    const selectedItems = items.filter(item => (parseInt(item.quantity) || 0) > 0);
    if (selectedItems.length === 0) {
      alert('Please select at least one item before placing an order!');
      return;
    }
    setShowConfirmPage(true);
  };

  const handleProceedPayment = (confirmedItems) => {
    const total = confirmedItems.reduce(
      (sum, item) => sum + item.price * (parseInt(item.quantity) || 0), 0
    );
    alert(`Proceeding to payment for ${confirmedItems.length} items!\nTotal: Rs. ${total.toFixed(2)}`);

    // Reset quantities
    setItems(prev => prev.map(item => ({ ...item, quantity: 0 })));
    setShowConfirmPage(false);
  };

  const handleCancelOrder = () => {
    setShowConfirmPage(false);
  };

  if (loading) {
    return (
      <div className="user-home">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="user-home">
        <h1>Seeds Vending Machine</h1>
        <div className="empty-inventory">
          <p>No products available right now. Please check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-home">
      <div className={`content-container ${showConfirmPage ? 'blurred' : ''}`}>
        <h1>Seeds Vending Machine</h1>

        <div className="items-container">
          {items.map(item => {
            const selected = parseInt(item.quantity) || 0;
            const atMax = selected >= item.availableQuantity;

            return (
              <div key={item.id} className="item-box">
                {/* Product image from Firebase Storage */}
                <div className="image-container">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="seed-image" />
                  ) : (
                    <div className="no-image-placeholder">🌱</div>
                  )}
                </div>

                {/* ── CHANGED: real name from Firebase ── */}
                <h3>{item.name}</h3>

                {/* Price */}
                <div className="item-price-tag">Rs. {item.price.toFixed(2)}</div>

                {/* ── CHANGED: stock badge ── */}
                <div className={`stock-badge ${atMax ? 'stock-max' : 'stock-ok'}`}>
                  {atMax
                    ? `Max (${item.availableQuantity} in stock)`
                    : `${item.availableQuantity} available`}
                </div>

                {/* Quantity controls */}
                <div className="quantity-form">
                  <div className="quantity-controls">
                    <button
                      type="button"
                      onClick={() => handleDecrement(item.id)}
                      className="quantity-btn"
                      disabled={selected === 0}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className="quantity-input"
                      min="0"
                      max={item.availableQuantity}
                    />

                    {/* ── CHANGED: + button disabled when at max ── */}
                    <button
                      type="button"
                      onClick={() => handleIncrement(item.id)}
                      className="quantity-btn"
                      disabled={atMax}
                      title={atMax ? 'Maximum stock reached' : ''}
                    >
                      +
                    </button>
                  </div>
                </div>

                <p>Selected: {selected}</p>
              </div>
            );
          })}
        </div>

        <PlaceOrder items={items} onPlaceOrder={handlePlaceOrder} />
      </div>

      {showConfirmPage && (
        <ConfirmPage
          items={items}
          onConfirm={handleProceedPayment}
          onCancel={handleCancelOrder}
          onClose={handleCancelOrder}
        />
      )}
    </div>
  );
};

export default UserHome;