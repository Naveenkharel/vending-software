// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {getStorage} from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAIKvZgYz5G23QALhLJXB0rEQBLjvFqKRI",
  authDomain: "vending--software.firebaseapp.com",
  projectId: "vending--software",
  storageBucket: "vending--software.firebasestorage.app",
  messagingSenderId: "1040652162839",
  appId: "1:1040652162839:web:c41d5cd955b03ee5af0952",
  measurementId: "G-2MXZKM6X95"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage=getStorage(app);

export { db ,storage };