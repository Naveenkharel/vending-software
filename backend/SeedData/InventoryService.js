// src/backend/seed-data/inventoryService.js
import { db } from './firebase-config';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';

// Reference to the inventory collection
const inventoryCollection = collection(db, 'inventory');

// Get all inventory items from Firebase
export const getAllInventory = async () => {
  try {
    const q = query(inventoryCollection, orderBy('slot'));
    const querySnapshot = await getDocs(q);
    const inventory = [];
    
    querySnapshot.forEach((doc) => {
      inventory.push({
        id: doc.id, // Firebase document ID
        ...doc.data()
      });
    });
    
    return inventory;
  } catch (error) {
    console.error('Error getting inventory:', error);
    throw error;
  }
};

// Get a single inventory item by ID
export const getInventoryItem = async (id) => {
  try {
    const docRef = doc(db, 'inventory', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    } else {
      throw new Error('No such document!');
    }
  } catch (error) {
    console.error('Error getting item:', error);
    throw error;
  }
};

// Add a new inventory item to Firebase
export const addInventoryItem = async (itemData) => {
  try {
    const docRef = await addDoc(inventoryCollection, {
      ...itemData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return {
      id: docRef.id,
      ...itemData
    };
  } catch (error) {
    console.error('Error adding item:', error);
    throw error;
  }
};

// Update an existing inventory item
export const updateInventoryItem = async (id, itemData) => {
  try {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, {
      ...itemData,
      updatedAt: new Date().toISOString()
    });
    
    return {
      id,
      ...itemData
    };
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

// Delete an inventory item
export const deleteInventoryItem = async (id) => {
  try {
    const docRef = doc(db, 'inventory', id);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

// Clear all inventory items
export const clearAllInventory = async () => {
  try {
    const querySnapshot = await getDocs(inventoryCollection);
    const deletePromises = [];
    
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    return true;
  } catch (error) {
    console.error('Error clearing inventory:', error);
    throw error;
  }
};