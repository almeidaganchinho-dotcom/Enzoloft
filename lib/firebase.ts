import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBVz9JxqL_3-m8vX5L4tQo0Y7cQ8KqJ9cA",
  authDomain: "enzoloft.firebaseapp.com",
  projectId: "enzoloft",
  storageBucket: "enzoloft.firebasestorage.app",
  messagingSenderId: "428656775658",
  appId: "1:428656775658:web:9d8b0c5e8f3a4b1c2d3e4f"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
