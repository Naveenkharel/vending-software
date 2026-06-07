import React, { useState, useEffect, useRef } from 'react';
import './AdminHome.css';
import {
  getAllInventory, addInventoryItem, updateInventoryItem,
  deleteInventoryItem, clearAllInventory
} from '../../backend/SeedData/InventoryService';

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET



const AdminHome = () => {
  const defaultSlots = [
    { slot: 'A1' }, { slot: 'A2' }, { slot: 'A3' },
    { slot: 'B1' }, { slot: 'B2' }, { slot: 'B3' },
    { slot: 'C1' }, { slot: 'C2' }, { slot: 'C3' },
  ];

  const [slots, setSlots]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [editingSlot, setEditingSlot]   = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Per-image upload progress 0-100
  const [imageProgress, setImageProgress] = useState({ 0: 0, 1: 0, 2: 0, 3: 0 });
  const [uploadStatus, setUploadStatus]   = useState('');

  const [imageSlots, setImageSlots] = useState(
    [0,1,2,3].map(() => ({ file: null, previewUrl: '', existingUrl: '' }))
  );
  const fileInputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const [formData, setFormData] = useState({
    slot: '', name: '', quantity: '', price: '', description: ''
  });

  useEffect(() => { loadInventory(); }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const inventory = await getAllInventory();
      const slotsWithData = defaultSlots.map(defaultSlot => {
        const fi = inventory.find(item => item.slot === defaultSlot.slot);
        return fi ? {
          id: fi.id, slot: fi.slot, name: fi.name,
          quantity: fi.quantity || 0, price: fi.price || 0,
          description: fi.description || '',
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
    setImageProgress({ 0: 0, 1: 0, 2: 0, 3: 0 });
    setUploadStatus('');
    setTimeout(() => {
      document.querySelector('.edit-form-container')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageFileChange = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert(`Image ${index + 1} is too large. Maximum size is 10MB.`);
      return;
    }
    const localUrl = URL.createObjectURL(file);
    setImageSlots(prev => prev.map((s, i) =>
      i === index ? { ...s, file, previewUrl: localUrl } : s
    ));
    setImageProgress(prev => ({ ...prev, [index]: 0 }));
  };

  const handleRemoveImage = (index) => {
    setImageSlots(prev => prev.map((s, i) =>
      i === index ? { file: null, previewUrl: '', existingUrl: '' } : s
    ));
    setImageProgress(prev => ({ ...prev, [index]: 0 }));
    if (fileInputRefs[index].current) fileInputRefs[index].current.value = '';
  };

  // ─── CLOUDINARY UPLOAD — real XHR progress events ────────────────────────
  const uploadToCloudinary = (file, imageIndex) => {
    return new Promise((resolve, reject) => {
      const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      const formDataObj = new FormData();
      formDataObj.append('file', file);
      formDataObj.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      // Optional: organise uploads into a folder
      formDataObj.append('folder', `vending_machine/${formDataObj.get('upload_preset')}`);

      const xhr = new XMLHttpRequest();

      // ── Real-time progress ──────────────────────────────────────────────
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const pct = Math.round((event.loaded / event.total) * 100);
          setImageProgress(prev => ({ ...prev, [imageIndex]: pct }));
          setUploadStatus(`Uploading image ${imageIndex + 1}... ${pct}%`);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            setImageProgress(prev => ({ ...prev, [imageIndex]: 100 }));
            resolve(data.secure_url);
          } catch {
            reject(new Error('Invalid JSON response from Cloudinary'));
          }
        } else {
          let errMsg = `Cloudinary upload failed (HTTP ${xhr.status})`;
          try {
            const errData = JSON.parse(xhr.responseText);
            errMsg = errData?.error?.message || errMsg;
          } catch {}
          reject(new Error(errMsg));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));

      xhr.open('POST', url);
      xhr.send(formDataObj);
    });
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formData.name || !formData.quantity || !formData.price) {
      alert('Please fill in Name, Quantity, and Price');
      return;
    }

    const newImages = imageSlots.filter(s => s.file !== null);

    try {
      setUploadingImage(true);
      setImageProgress({ 0: 0, 1: 0, 2: 0, 3: 0 });
      setUploadStatus(newImages.length > 0 ? 'Preparing upload...' : 'Saving...');

      const finalImages = [];

      for (let i = 0; i < 4; i++) {
        const s = imageSlots[i];

        if (s.file) {
          setUploadStatus(`Uploading image ${i + 1} of ${newImages.length}...`);
          try {
            const url = await uploadToCloudinary(s.file, i);
            finalImages.push(url);
          } catch (uploadError) {
            alert(`Image ${i + 1} upload failed:\n${uploadError.message}`);
            setUploadingImage(false);
            setUploadStatus('Upload failed. Try again.');
            return;
          }
        } else if (s.existingUrl) {
          finalImages.push(s.existingUrl);
        }
      }

      setUploadStatus('Saving to database...');

      const itemData = {
        slot:        formData.slot,
        name:        formData.name,
        quantity:    parseInt(formData.quantity) || 0,
        price:       parseFloat(formData.price) || 0,
        description: formData.description,
        images:      finalImages,
      };

      const existingSlot = slots.find(s => s.slot === formData.slot && s.id);
      if (existingSlot?.id) {
        await updateInventoryItem(existingSlot.id, itemData);
      } else {
        await addInventoryItem(itemData);
      }

      setUploadStatus('Saved successfully!');

      setTimeout(() => {
        loadInventory();
        handleCancel();
      }, 800);

    } catch (error) {
      console.error('Error saving slot:', error);
      alert(`Error saving: ${error.message}`);
      setUploadStatus('Save failed.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCancel = () => {
    setEditingSlot(null);
    setImageSlots([0,1,2,3].map(() => ({ file: null, previewUrl: '', existingUrl: '' })));
    fileInputRefs.forEach(r => { if (r.current) r.current.value = ''; });
    setFormData({ slot: '', name: '', quantity: '', price: '', description: '' });
    setImageProgress({ 0: 0, 1: 0, 2: 0, 3: 0 });
    setUploadStatus('');
  };

  const handleClearSlot = async (slot) => {
    if (!slot.id) {
      setSlots(prev => prev.map(s =>
        s.slot === slot.slot
          ? { ...s, name: '', quantity: 0, price: 0, description: '', images: [] }
          : s
      ));
      return;
    }
    if (window.confirm(`Clear slot ${slot.slot} "${slot.name}" from database?`)) {
      try {
        await deleteInventoryItem(slot.id);
        await loadInventory();
      } catch { alert('Error clearing slot'); }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear ALL slots from the database? This cannot be undone.')) {
      try {
        await clearAllInventory();
        await loadInventory();
      } catch { alert('Error clearing all slots'); }
    }
  };

  // Overall progress — average across all NEW files being uploaded
  const newFileCount = imageSlots.filter(s => s.file).length;
  const totalProgress = newFileCount === 0 ? 0 : Math.round(
    imageSlots.reduce((sum, s, i) => s.file ? sum + (imageProgress[i] || 0) : sum, 0) /
    newFileCount
  );

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

      {/* ── HEADER ── */}
      <div className="admin-header">
        <h1>🌱 Vending Machine Admin</h1>
        <div className="firebase-status">
          <span className="firebase-connected">● Connected</span>
        </div>
        <div className="admin-stats">
          <div className="stat-item">
            <span className="stat-label">Total Slots</span>
            <span className="stat-value">{slots.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Active</span>
            <span className="stat-value">{filledSlots}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Empty</span>
            <span className="stat-value">{slots.length - filledSlots}</span>
          </div>
        </div>
      </div>

      <div className="admin-container">

        {/* ── SLOTS TABLE ── */}
        <div className="slots-table-container">
          <div className="table-header">
            <h2>Inventory Slots</h2>
            <div className="table-actions">
              <button onClick={loadInventory} className="refresh-btn">Refresh</button>
              <button onClick={handleClearAll} className="clear-all-btn">Clear All</button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="slots-table">
              <thead>
                <tr>
                  <th>Slot</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Images</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots.map(slot => (
                  <tr
                    key={slot.slot}
                    className={
                      slot.name && slot.quantity > 0 ? 'filled'
                      : slot.name ? 'out-of-stock-row'
                      : 'empty'
                    }
                  >
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
                      ) : (
                        <span className="no-image">No images</span>
                      )}
                    </td>
                    <td className="status">
                      <span className={`status-badge ${
                        slot.name && slot.quantity > 0 ? 'active'
                        : slot.name ? 'out'
                        : 'inactive'
                      }`}>
                        {slot.name && slot.quantity > 0 ? 'Active'
                          : slot.name ? 'Out of Stock'
                          : 'Empty'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        onClick={() => handleEditClick(slot)}
                        className={`edit-btn ${editingSlot === slot.slot ? 'edit-btn--active' : ''}`}
                      >
                        {slot.name ? 'Edit' : 'Add'}
                      </button>
                      {(slot.name || slot.id) && (
                        <button onClick={() => handleClearSlot(slot)} className="clear-btn">
                          Clear
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── EDIT / ADD FORM ── */}
        {editingSlot && (
          <div className="edit-form-container">
            <div className="edit-form">
              <div className="edit-form-title-row">
                <h2>
                  {slots.find(s => s.slot === formData.slot)?.name
                    ? `Edit Slot ${formData.slot}`
                    : `Add to Slot ${formData.slot}`}
                </h2>
                <button className="form-close-btn" onClick={handleCancel}>×</button>
              </div>
              <p className="form-note">Images are uploaded to Cloudinary · Data saved to Firestore</p>

              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text" name="name" value={formData.name}
                  onChange={handleInputChange} placeholder="e.g. Sunflower Seeds"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input
                    type="number" name="quantity" value={formData.quantity}
                    onChange={handleInputChange} placeholder="0" min="0"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Price (NRs.)</label>
                  <input
                    type="number" name="price" value={formData.price}
                    onChange={handleInputChange} placeholder="0.00" min="0" step="0.01"
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description <span className="optional">(optional)</span></label>
                <textarea
                  name="description" value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of the product"
                  rows="2" className="form-textarea"
                />
              </div>

              {/* ── 4 IMAGE GRID ── */}
              <div className="form-group">
                <label>
                  Product Images
                  <span className="optional"> — up to 4, max 10MB each</span>
                </label>

                <div className="four-image-grid">
                  {[0,1,2,3].map(i => (
                    <div key={i} className="image-upload-cell">
                      <input
                        type="file" accept="image/*"
                        ref={fileInputRefs[i]}
                        onChange={(e) => handleImageFileChange(i, e)}
                        style={{ display: 'none' }}
                      />

                      {imageSlots[i].previewUrl ? (
                        <div className="cell-preview" onClick={() => !uploadingImage && fileInputRefs[i].current?.click()}>
                          <img src={imageSlots[i].previewUrl} alt={`Image ${i+1}`} className="cell-img" />

                          {/* Circular progress ring — shown while this image is uploading */}
                          {uploadingImage && imageSlots[i].file && imageProgress[i] < 100 && (
                            <div className="cell-upload-overlay">
                              <div className="cell-upload-ring">
                                <svg viewBox="0 0 36 36">
                                  <circle cx="18" cy="18" r="15" fill="none"
                                    stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                                  <circle
                                    cx="18" cy="18" r="15" fill="none"
                                    stroke="white" strokeWidth="3"
                                    strokeDasharray={`${(imageProgress[i] / 100) * 94.25} 94.25`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 18 18)"
                                    style={{ transition: 'stroke-dasharray 0.2s ease' }}
                                  />
                                </svg>
                                <span className="cell-upload-pct">{imageProgress[i]}%</span>
                              </div>
                            </div>
                          )}

                          {/* Green tick when done */}
                          {uploadingImage && imageSlots[i].file && imageProgress[i] === 100 && (
                            <div className="cell-done-overlay">✓</div>
                          )}

                          {!uploadingImage && (
                            <button
                              type="button" className="remove-img-btn"
                              onClick={(e) => { e.stopPropagation(); handleRemoveImage(i); }}
                            >×</button>
                          )}
                        </div>
                      ) : (
                        <div className="cell-empty" onClick={() => !uploadingImage && fileInputRefs[i].current?.click()}>
                          <span className="cell-plus">+</span>
                          <span className="cell-label">Image {i + 1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <small className="form-hint">Click a cell to pick an image. Click an existing image to replace it.</small>
              </div>

              {/* ── OVERALL PROGRESS BAR (shown during upload) ── */}
              {uploadingImage && (
                <div className="upload-status-block">
                  <div className="upload-status-text">{uploadStatus}</div>

                  <div className="upload-progress-track">
                    <div
                      className="upload-progress-fill"
                      style={{ width: `${totalProgress}%` }}
                    />
                  </div>

                  {/* Per-image chips */}
                  <div className="upload-progress-numbers">
                    {imageSlots.map((s, i) => s.file ? (
                      <span
                        key={i}
                        className={`img-progress-chip ${imageProgress[i] === 100 ? 'done' : 'uploading'}`}
                      >
                        {imageProgress[i] === 100 ? 'Done' : 'Uploading'} Img {i + 1}: {imageProgress[i]}%
                      </span>
                    ) : null)}
                  </div>
                </div>
              )}

              {/* ── FORM ACTIONS ── */}
              <div className="form-actions">
                <button onClick={handleCancel} className="cancel-btn" disabled={uploadingImage}>
                  Cancel
                </button>
                <button onClick={handleSave} className="save-btn" disabled={uploadingImage}>
                  {uploadingImage ? uploadStatus || 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminHome;