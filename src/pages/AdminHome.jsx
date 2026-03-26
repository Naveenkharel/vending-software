import React, { useState, useEffect, useRef } from 'react';
import './AdminHome.css';
import { 
  getAllInventory, 
  addInventoryItem, 
  updateInventoryItem, 
  deleteInventoryItem,
  clearAllInventory 
} from '../../backend/SeedData/InventoryService';
import { storage } from '../../backend/SeedData/firebase-config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const AdminHome = () => {
  const defaultSlots = [
    { slot: 'A1' }, { slot: 'A2' }, { slot: 'A3' },
    { slot: 'B1' }, { slot: 'B2' }, { slot: 'B3' },
    { slot: 'C1' }, { slot: 'C2' }, { slot: 'C3' },
  ];

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null);
  const [imageFile, setImageFile] = useState(null);       // NEW: holds the selected File object
  const [imagePreviewUrl, setImagePreviewUrl] = useState(''); // NEW: local object URL for preview
  const [uploadingImage, setUploadingImage] = useState(false); // NEW: upload progress flag
  const fileInputRef = useRef(null);                       // NEW: ref to hidden file input

  const [formData, setFormData] = useState({
    slot: '',
    name: '',
    quantity: '',
    price: '',
    description: '',
    imageUrl: ''   // still stored here after upload
  });

  useEffect(() => {
    loadInventoryFromFirebase();
  }, []);

  const loadInventoryFromFirebase = async () => {
    try {
      setLoading(true);
      const inventory = await getAllInventory();
      
      const slotsWithData = defaultSlots.map(defaultSlot => {
        const firebaseItem = inventory.find(item => item.slot === defaultSlot.slot);
        return firebaseItem ? {
          id: firebaseItem.id,
          slot: firebaseItem.slot,
          name: firebaseItem.name,
          quantity: firebaseItem.quantity || 0,
          price: firebaseItem.price || 0,
          description: firebaseItem.description || '',
          imageUrl: firebaseItem.imageUrl || ''
        } : {
          slot: defaultSlot.slot,
          name: '',
          quantity: 0,
          price: 0,
          description: '',
          imageUrl: ''
        };
      });
      
      setSlots(slotsWithData);
    } catch (error) {
      console.error('Error loading inventory:', error);
      alert('Error loading inventory from database');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (slot) => {
    setEditingSlot(slot.slot);
    setImageFile(null);
    setImagePreviewUrl(slot.imageUrl || '');
    setFormData({
      slot: slot.slot,
      name: slot.name || '',
      quantity: slot.quantity?.toString() || '',
      price: slot.price?.toString() || '',
      description: slot.description || '',
      imageUrl: slot.imageUrl || ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // NEW: handle file picked from device
  const handleImageFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, GIF, WebP, etc.)');
      return;
    }

    setImageFile(file);
    // Create a local preview URL so the user sees it immediately
    const localUrl = URL.createObjectURL(file);
    setImagePreviewUrl(localUrl);
  };

  // NEW: upload the selected file to Firebase Storage and return the download URL
  const uploadImageToStorage = async (file, slotName) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `inventory/${slotName}_${Date.now()}.${fileExt}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  };

  const handleSave = async () => {
    if (!formData.name || !formData.quantity || !formData.price) {
      alert('Please fill in at least Name, Quantity, and Price');
      return;
    }

    try {
      setUploadingImage(true);
      let finalImageUrl = formData.imageUrl; // keep existing URL by default

      // If the admin picked a new file, upload it first
      if (imageFile) {
        finalImageUrl = await uploadImageToStorage(imageFile, formData.slot);
      }

      const itemData = {
        slot: formData.slot,
        name: formData.name,
        quantity: parseInt(formData.quantity) || 0,
        price: parseFloat(formData.price) || 0,
        description: formData.description,
        imageUrl: finalImageUrl
      };

      const existingSlot = slots.find(s => s.slot === formData.slot && s.id);
      
      if (existingSlot && existingSlot.id) {
        await updateInventoryItem(existingSlot.id, itemData);
        alert('Slot updated successfully in Firebase!');
      } else {
        await addInventoryItem(itemData);
        alert('Slot added successfully to Firebase!');
      }

      await loadInventoryFromFirebase();
      handleCancel();
      
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      alert('Error saving to database. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancel = () => {
    setEditingSlot(null);
    setImageFile(null);
    setImagePreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormData({ slot: '', name: '', quantity: '', price: '', description: '', imageUrl: '' });
  };

  const handleClearSlot = async (slot) => {
    if (!slot.id) {
      const updatedSlots = slots.map(s =>
        s.slot === slot.slot ? { ...s, name: '', quantity: 0, price: 0, description: '', imageUrl: '' } : s
      );
      setSlots(updatedSlots);
      alert('Slot cleared!');
      return;
    }

    if (window.confirm('Are you sure you want to clear this slot from Firebase?')) {
      try {
        await deleteInventoryItem(slot.id);
        alert('Slot cleared from Firebase!');
        await loadInventoryFromFirebase();
      } catch (error) {
        console.error('Error deleting from Firebase:', error);
        alert('Error clearing slot from database');
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to clear ALL slots from Firebase? This cannot be undone.')) {
      try {
        await clearAllInventory();
        alert('All slots cleared from Firebase!');
        await loadInventoryFromFirebase();
      } catch (error) {
        console.error('Error clearing all from Firebase:', error);
        alert('Error clearing all slots from database');
      }
    }
  };

  const filledSlots = slots.filter(slot => slot.name && slot.quantity > 0).length;

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading inventory from Firebase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Vending Machine Admin Panel</h1>
        <div className="firebase-status">
          <span className="firebase-connected"> Connected to Firebase</span>
        </div>
        <div className="admin-stats">
          <div className="stat-item">
            <span className="stat-label">Total Slots:</span>
            <span className="stat-value">{slots.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Filled Slots:</span>
            <span className="stat-value">{filledSlots}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Empty Slots:</span>
            <span className="stat-value">{slots.length - filledSlots}</span>
          </div>
        </div>
      </div>

      <div className="admin-container">
        <div className="slots-table-container">
          <div className="table-header">
            <h2>Inventory Slots (Firestore Database)</h2>
            <div className="table-actions">
              <button onClick={handleClearAll} className="clear-all-btn">
                Clear All from Firebase
              </button>
              <button onClick={loadInventoryFromFirebase} className="refresh-btn">
                Refresh Data
              </button>
            </div>
          </div>
          
          <div className="table-wrapper">
            <table className="slots-table">
              <thead>
                <tr>
                  <th>Slot Number</th>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Image Preview</th>
                  <th>Firebase ID</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.slot} className={slot.name ? 'filled' : 'empty'}>
                    <td className="slot-number">{slot.slot}</td>
                    <td className="product-name">{slot.name || 'Empty'}</td>
                    <td className="quantity">{slot.quantity}</td>
                    <td className="price">Rs. {slot.price.toFixed(2)}</td>
                    <td className="image-preview">
                      {slot.imageUrl ? (
                        <div className="image-container">
                          <img src={slot.imageUrl} alt={slot.name} />
                        </div>
                      ) : (
                        <span className="no-image">No Image</span>
                      )}
                    </td>
                    <td className="firebase-id">
                      {slot.id ? (
                        <small>{slot.id.substring(0, 8)}...</small>
                      ) : (
                        <span className="not-saved">Not in DB</span>
                      )}
                    </td>
                    <td className="status">
                      <span className={`status-badge ${slot.name ? 'active' : 'inactive'}`}>
                        {slot.name ? 'Active' : 'Empty'}
                      </span>
                    </td>
                    <td className="actions">
                      <button onClick={() => handleEditClick(slot)} className="edit-btn">
                        {slot.name ? '✏️ Edit' : '➕ Add'}
                      </button>
                      {(slot.name || slot.id) && (
                        <button onClick={() => handleClearSlot(slot)} className="clear-btn">
                          🗑️ Clear
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {editingSlot && (
          <div className="edit-form-container">
            <div className="edit-form">
              <h2>Edit Slot: {formData.slot}</h2>
              <p className="form-note">Changes will be saved to Firebase Firestore</p>
              
              <div className="form-group">
                <label htmlFor="name">Product Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter product name"
                  className="form-input"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="quantity">Quantity *</label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleInputChange}
                    placeholder="0"
                    min="0"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="price">Price (NRs.) *</label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter product description (optional)"
                  rows="3"
                  className="form-textarea"
                />
              </div>

              {/* ── CHANGED: device file upload instead of URL input ── */}
              <div className="form-group">
                <label>Product Image</label>

                {/* Hidden native file input */}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  style={{ display: 'none' }}
                  id="imageFileInput"
                />

                {/* Styled upload button */}
                <div className="image-upload-area" onClick={() => fileInputRef.current?.click()}>
                  {imagePreviewUrl ? (
                    <div className="upload-preview">
                      <img src={imagePreviewUrl} alt="Preview" className="upload-preview-img" />
                      <span className="change-image-label">Click to change image</span>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <span className="upload-icon">📁</span>
                      <span className="upload-text">Click to upload image from device</span>
                      <span className="upload-hint">JPG, PNG, GIF, WebP supported</span>
                    </div>
                  )}
                </div>

                {imageFile && (
                  <small className="form-hint">
                    Selected: {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)
                  </small>
                )}
              </div>
              {/* ── END CHANGED ── */}

              <div className="form-actions">
                <button onClick={handleSave} className="save-btn" disabled={uploadingImage}>
                  {uploadingImage ? '⏳ Uploading...' : ' Save to Firebase'}
                </button>
                <button onClick={handleCancel} className="cancel-btn" disabled={uploadingImage}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="instructions">
        <h3>Firebase Integration Instructions:</h3>
        <ul>
          <li><strong>Add/Edit:</strong> Data saved directly to Firebase Firestore</li>
          <li><strong>Image:</strong> Upload from your device — stored in Firebase Storage</li>
          <li><strong>Clear:</strong> Removes item from Firebase database</li>
          <li><strong>Refresh:</strong> Fetches latest data from Firebase</li>
          <li><strong>Firebase ID:</strong> Shows the document ID in Firestore</li>
          <li><strong>Status:</strong> Green = Active in Firebase, Red = Not in Firebase</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminHome;