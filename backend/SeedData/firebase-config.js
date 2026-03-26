// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {getStorage} from 'firebase/storage';


const firebaseConfig = {
  apiKey: "AIzaSyD5-UqkpKYYH-X0ow0t6itjy4tX49-7o7A",
  authDomain: "vending-softwware.firebaseapp.com",
  projectId: "vending-softwware",
  storageBucket: "vending-softwware.firebasestorage.app",
  messagingSenderId: "375949689524",
  appId: "1:375949689524:web:f7ebe2e5224ec82b7a0de1",
  measurementId: "G-3XMB5MRHHJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage=getStorage(app);

export { db ,storage };