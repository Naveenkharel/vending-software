import React, { useState, useEffect, useRef } from 'react';
import './AdminHome.css';
import { 
  getAllInventory, addInventoryItem, updateInventoryItem,
  deleteInventoryItem, clearAllInventory 
} from '../../backend/SeedData/InventoryService';
import { storage } from '../../backend/SeedData/firebase-config';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const AdminHome = () => {
  const defaultSlots = [
    { slot: 'A1' }, { slot: 'A2' }, { slot: 'A3' },
    { slot: 'B1' }, { slot: 'B2' }, { slot: 'B3' },
    { slot: 'C1' }, { slot: 'C2' }, { slot: 'C3' },
  ];

  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingSlot, setEditingSlot] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 4 image upload cells
  const [imageSlots, setImageSlots] = useState(
    [0,1,2,3].map(() => ({ file: null, previewUrl: '', existingUrl: '' }))
  );
  const fileInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const [formData, setFormData] = useState({
    slot: '', name: '', quantity: '', price: '', description: ''
  });

  useEffect(() => { loadInventoryFromFirebase(); }, []);

  const loadInventoryFromFirebase = async () => {
    try {
      setLoading(true);
      const inventory = await getAllInventory();
      const slotsWithData = defaultSlots.map(defaultSlot => {
        const fi = inventory.find(item => item.slot === defaultSlot.slot);
        return fi ? {
          id: fi.id, slot: fi.slot, name: fi.name,
          quantity: fi.quantity || 0, price: fi.price || 0,
          description: fi.description || '',
          // support both old imageUrl (single) and new images (array)
          images: fi.images || (fi.imageUrl ? [fi.imageUrl] : [])
        } : {
          slot: defaultSlot.slot, name: '', quantity: 0,
          price: 0, description: '', images: []
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
    setFormData({
      slot: slot.slot, name: slot.name || '',
      quantity: slot.quantity?.toString() || '',
      price: slot.price?.toString() || '',
      description: slot.description || ''
    });
    const existing = slot.images || [];
    setImageSlots([0,1,2,3].map(i => ({
      file: null,
      previewUrl: existing[i] || '',
      existingUrl: existing[i] || ''
    })));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageFileChange = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setImageSlots(prev => prev.map((s, i) =>
      i === index ? { ...s, file, previewUrl: localUrl } : s
    ));
  };

  const handleRemoveImage = (index) => {
    setImageSlots(prev => prev.map((s, i) =>
      i === index ? { file: null, previewUrl: '', existingUrl: '' } : s
    ));
    if (fileInputRefs[index].current) fileInputRefs[index].current.value = '';
  };

  // Upload one file using resumable upload so progress is tracked
  const uploadSingleImage = (file, storagePath) => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, file);
      task.on(
        'state_changed',
        (snap) => {
          const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          setUploadProgress(pct);
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });
  };

  const handleSave = async () => {
    if (!formData.name || !formData.quantity || !formData.price) {
      alert('Please fill in Name, Quantity, and Price');
      return;
    }
    try {
      setUploadingImage(true);
      setUploadProgress(0);

      const finalImages = [];
      for (let i = 0; i < 4; i++) {
        const s = imageSlots[i];
        if (s.file) {
          const ext = s.file.name.split('.').pop();
          const path = `inventory/${formData.slot}_img${i + 1}_${Date.now()}.${ext}`;
          const url = await uploadSingleImage(s.file, path);
          finalImages.push(url);
        } else if (s.existingUrl) {
          finalImages.push(s.existingUrl);
        }
      }

      const itemData = {
        slot: formData.slot,
        name: formData.name,
        quantity: parseInt(formData.quantity) || 0,
        price: parseFloat(formData.price) || 0,
        description: formData.description,
        images: finalImages
      };

      const existingSlot = slots.find(s => s.slot === formData.slot && s.id);
      if (existingSlot?.id) {
        await updateInventoryItem(existingSlot.id, itemData);
        alert('Slot updated!');
      } else {
        await addInventoryItem(itemData);
        alert('Slot added!');
      }

      await loadInventoryFromFirebase();
      handleCancel();
    } catch (error) {
      console.error('Error saving:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleCancel = () => {
    setEditingSlot(null);
    setImageSlots([0,1,2,3].map(() => ({ file: null, previewUrl: '', existingUrl: '' })));
    fileInputRefs.forEach(r => { if (r.current) r.current.value = ''; });
    setFormData({ slot: '', name: '', quantity: '', price: '', description: '' });
  };

  const handleClearSlot = async (slot) => {
    if (!slot.id) {
      setSlots(prev => prev.map(s =>
        s.slot === slot.slot ? { ...s, name: '', quantity: 0, price: 0, description: '', images: [] } : s
      ));
      return;
    }
    if (window.confirm('Clear this slot from Firebase?')) {
      try {
        await deleteInventoryItem(slot.id);
        await loadInventoryFromFirebase();
      } catch { alert('Error clearing slot'); }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear ALL slots? Cannot be undone.')) {
      try {
        await clearAllInventory();
        await loadInventoryFromFirebase();
      } catch { alert('Error clearing all'); }
    }
  };

  const filledSlots = slots.filter(s => s.name && s.quantity > 0).length;

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Vending Machine Admin Panel</h1>
        <div className="firebase-status">
          <span className="firebase-connected">Connected to Firebase</span>
        </div>
        <div className="admin-stats">
          <div className="stat-item"><span className="stat-label">Total Slots</span><span className="stat-value">{slots.length}</span></div>
          <div className="stat-item"><span className="stat-label">Filled</span><span className="stat-value">{filledSlots}</span></div>
          <div className="stat-item"><span className="stat-label">Empty</span><span className="stat-value">{slots.length - filledSlots}</span></div>
        </div>
      </div>

      <div className="admin-container">
        <div className="slots-table-container">
          <div className="table-header">
            <h2>Inventory Slots</h2>
            <div className="table-actions">
              <button onClick={handleClearAll} className="clear-all-btn">Clear All</button>
              <button onClick={loadInventoryFromFirebase} className="refresh-btn">Refresh</button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="slots-table">
              <thead>
                <tr>
                  <th>Slot</th><th>Product Name</th><th>Qty</th>
                  <th>Price</th><th>Images</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr key={slot.slot}
                    className={slot.name && slot.quantity > 0 ? 'filled' : slot.name ? 'out-of-stock-row' : 'empty'}>
                    <td className="slot-number">{slot.slot}</td>
                    <td className="product-name">{slot.name || '—'}</td>
                    <td className="quantity">{slot.quantity}</td>
                    <td className="price">Rs. {parseFloat(slot.price || 0).toFixed(2)}</td>
                    <td className="image-preview">
                      {slot.images?.length > 0 ? (
                        <div className="thumb-row">
                          {slot.images.map((url, i) => (
                            <img key={i} src={url} alt={`img${i+1}`} className="thumb" />
                          ))}
                        </div>
                      ) : <span className="no-image">No Images</span>}
                    </td>
                    <td className="status">
                      <span className={`status-badge ${slot.name && slot.quantity > 0 ? 'active' : slot.name ? 'out' : 'inactive'}`}>
                        {slot.name && slot.quantity > 0 ? 'Active' : slot.name ? 'Out of Stock' : 'Empty'}
                      </span>
                    </td>
                    <td className="actions">
                      <button onClick={() => handleEditClick(slot)} className="edit-btn">
                        {slot.name ? '✏️ Edit' : '➕ Add'}
                      </button>
                      {(slot.name || slot.id) && (
                        <button onClick={() => handleClearSlot(slot)} className="clear-btn">🗑️ Clear</button>
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
              <p className="form-note">Changes saved to Firebase Firestore</p>

              <div className="form-group">
                <label>Product Name *</label>
                <input type="text" name="name" value={formData.name}
                  onChange={handleInputChange} placeholder="Enter product name" className="form-input" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity *</label>
                  <input type="number" name="quantity" value={formData.quantity}
                    onChange={handleInputChange} placeholder="0" min="0" className="form-input" />
                </div>
                <div className="form-group">
                  <label>Price (NRs.) *</label>
                  <input type="number" name="price" value={formData.price}
                    onChange={handleInputChange} placeholder="0.00" min="0" step="0.01" className="form-input" />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea name="description" value={formData.description}
                  onChange={handleInputChange} placeholder="Optional" rows="3" className="form-textarea" />
              </div>

              {/* 4-image grid */}
              <div className="form-group">
                <label>Product Images (up to 4)</label>
                <div className="four-image-grid">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="image-upload-cell">
                      <input type="file" accept="image/*" ref={fileInputRefs[i]}
                        onChange={(e) => handleImageFileChange(i, e)} style={{ display: 'none' }} />
                      {imageSlots[i].previewUrl ? (
                        <div className="cell-preview" onClick={() => fileInputRefs[i].current?.click()}>
                          <img src={imageSlots[i].previewUrl} alt={`Image ${i+1}`} className="cell-img" />
                          <button type="button" className="remove-img-btn"
                            onClick={(e) => { e.stopPropagation(); handleRemoveImage(i); }}>×</button>
                        </div>
                      ) : (
                        <div className="cell-empty" onClick={() => fileInputRefs[i].current?.click()}>
                          <span className="cell-plus">+</span>
                          <span className="cell-label">Image {i + 1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <small className="form-hint">Click a cell to pick an image from your device. Click image to replace.</small>
              </div>

              {uploadingImage && (
                <div className="upload-progress-bar">
                  <div className="upload-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                  <span className="upload-progress-label">Uploading... {uploadProgress}%</span>
                </div>
              )}

              <div className="form-actions">
                <button onClick={handleSave} className="save-btn" disabled={uploadingImage}>
                  {uploadingImage ? `⏳ ${uploadProgress}%` : '💾 Save to Firebase'}
                </button>
                <button onClick={handleCancel} className="cancel-btn" disabled={uploadingImage}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHome;