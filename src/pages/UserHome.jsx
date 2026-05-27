// Updated UserHome.jsx (with payment method support)
import React, { useState, useEffect } from 'react';
import './UserHome.css';
import PlaceOrder from '../Components/PlaceOrder';
import ConfirmPage from './ConfirmPage';
import { getAllInventory } from '../../backend/SeedData/InventoryService';
import { decreaseQuantity } from '../../backend/SeedData/InventoryService';

// ── Simple swipeable image carousel for each product card ──
const ImageCarousel = ({ images, name }) => {
  const [current, setCurrent] = useState(0);
  if (!images || images.length === 0) {
    return (
      <div className="carousel-empty">
        <span>🌱</span>
      </div>
    );
  }
  const prev = (e) => {
    e.stopPropagation();
    setCurrent(i => (i === 0 ? images.length - 1 : i - 1));
  };
  const next = (e) => {
    e.stopPropagation();
    setCurrent(i => (i === images.length - 1 ? 0 : i + 1));
  };

  return (
    <div className="carousel">
      <img src={images[current]} alt={`${name} ${current + 1}`} className="carousel-img" />

      {images.length > 1 && (
        <>
          <button className="carousel-btn carousel-prev" onClick={prev}>‹</button>
          <button className="carousel-btn carousel-next" onClick={next}>›</button>

          <div className="carousel-dots">
            {images.map((_, i) => (
              <span
                key={i}
                className={`carousel-dot ${i === current ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const UserHome = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmPage, setShowConfirmPage] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const inventory = await getAllInventory();

      const mapped = inventory.map(item => ({
        id: item.id,
        slot: item.slot,
        name: item.name || 'Coming Soon',
        price: parseFloat(item.price) || 0,
        availableQuantity: parseInt(item.quantity) || 0,
        quantity: 0,
        images: item.images || (item.imageUrl ? [item.imageUrl] : []),
        description: item.description || '',
        inStock: (parseInt(item.quantity) || 0) > 0 && !!item.name
      }));

      setItems(mapped);
    } catch (error) {
      console.error('Error loading inventory:', error);
      alert('Could not load products. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleIncrement = (id) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id || !item.inStock) return item;
      const current = parseInt(item.quantity) || 0;
      if (current >= item.availableQuantity) return item;
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

  const handleInputChange = (id, value) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id || !item.inStock) return item;
      if (value === '') return { ...item, quantity: '' };
      const num = parseInt(value);
      if (isNaN(num) || num < 0) return item;
      return { ...item, quantity: Math.min(num, item.availableQuantity) };
    }));
  };

  const handlePlaceOrder = () => {
    const selected = items.filter(item => (parseInt(item.quantity) || 0) > 0);
    if (selected.length === 0) {
      alert('Please select at least one item!');
      return;
    }
    setShowConfirmPage(true);
  };

  // Decrease stock in Firestore after successful payment
  const handleProceedPayment = async (confirmedItems, paymentMethod, totalAmount) => {
    try {
      await Promise.all(
        confirmedItems.map(item =>
          decreaseQuantity(item.id, parseInt(item.quantity) || 0)
        )
      );

      // Show payment success message with method
      alert(`✅ Payment Successful!\n\nMethod: ${paymentMethod.toUpperCase()}\nTotal: Rs. ${totalAmount.toFixed(2)}\n\nThank you for your purchase!`);

      setShowConfirmPage(false);
      await loadInventory();

    } catch (error) {
      console.error('Error updating stock:', error);
      alert('⚠️ Payment processed but stock update failed. Please inform admin.');
      setShowConfirmPage(false);
    }
  };

  const handleCancelOrder = () => setShowConfirmPage(false);

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
        <p className="empty-inventory">No products available right down.</p>
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
              <div key={item.id} className={`item-box ${!item.inStock ? 'item-box--oos' : ''}`}>
                <ImageCarousel images={item.images} name={item.name} />
                <h3>{item.name}</h3>
                <div className="item-price-tag">Rs. {item.price.toFixed(2)}</div>

                {item.inStock ? (
                  <div className={`stock-badge ${atMax ? 'stock-max' : 'stock-ok'}`}>
                    {atMax
                      ? `Max — ${item.availableQuantity} in stock`
                      : `${item.availableQuantity} available`}
                  </div>
                ) : (
                  <div className="stock-badge stock-oos">Out of Stock</div>
                )}

                <div className="quantity-form">
                  <div className="quantity-controls">
                    <button
                      type="button"
                      onClick={() => handleDecrement(item.id)}
                      className="quantity-btn"
                      disabled={!item.inStock || selected === 0}
                    >−</button>

                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className="quantity-input"
                      min="0"
                      max={item.availableQuantity}
                      disabled={!item.inStock}
                    />

                    <button
                      type="button"
                      onClick={() => handleIncrement(item.id)}
                      className="quantity-btn"
                      disabled={!item.inStock || atMax}
                    >+</button>
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