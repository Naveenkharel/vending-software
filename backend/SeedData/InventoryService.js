// backend/SeedData/InventoryService.js
import { db } from './firebase-config';
import { 
  collection, doc, getDocs, getDoc,
  addDoc, updateDoc, deleteDoc, query, orderBy 
} from 'firebase/firestore';

const inventoryCollection = collection(db, 'inventory');

export const getAllInventory = async () => {
  try {
    const q = query(inventoryCollection, orderBy('slot'));
    const querySnapshot = await getDocs(q);
    const inventory = [];
    querySnapshot.forEach((doc) => {
      inventory.push({ id: doc.id, ...doc.data() });
    });
    return inventory;
  } catch (error) {
    console.error('Error getting inventory:', error);
    throw error;
  }
};

export const getInventoryItem = async (id) => {
  try {
    const docRef = doc(db, 'inventory', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) return { id: docSnap.id, ...docSnap.data() };
    throw new Error('No such document!');
  } catch (error) {
    console.error('Error getting item:', error);
    throw error;
  }
};

export const addInventoryItem = async (itemData) => {
  try {
    const docRef = await addDoc(inventoryCollection, {
      ...itemData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return { id: docRef.id, ...itemData };
  } catch (error) {
    console.error('Error adding item:', error);
    throw error;
  }
};

export const updateInventoryItem = async (id, itemData) => {
  try {
    const docRef = doc(db, 'inventory', id);
    await updateDoc(docRef, { ...itemData, updatedAt: new Date().toISOString() });
    return { id, ...itemData };
  } catch (error) {
    console.error('Error updating item:', error);
    throw error;
  }
};

export const deleteInventoryItem = async (id) => {
  try {
    await deleteDoc(doc(db, 'inventory', id));
    return true;
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

export const clearAllInventory = async () => {
  try {
    const querySnapshot = await getDocs(inventoryCollection);
    await Promise.all(querySnapshot.docs.map(doc => deleteDoc(doc.ref)));
    return true;
  } catch (error) {
    console.error('Error clearing inventory:', error);
    throw error;
  }
};

// NEW ── reduces stock after a successful order
export const decreaseQuantity = async (id, amountToDecrease) => {
  try {
    const docRef = doc(db, 'inventory', id);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) throw new Error('Item not found');

    const currentQty = parseInt(docSnap.data().quantity) || 0;
    const newQty = Math.max(0, currentQty - amountToDecrease);

    await updateDoc(docRef, {
      quantity: newQty,
      updatedAt: new Date().toISOString()
    });
    return newQty;
  } catch (error) {
    console.error('Error decreasing quantity:', error);
    throw error;
  }
};