import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDU5_Lu7islxpFCkqjz7O0-DnliCB5JSeA",
  authDomain: "enzoloft-51508.firebaseapp.com",
  projectId: "enzoloft",
  storageBucket: "enzoloft.firebasestorage.app",
  messagingSenderId: "309372653282",
  appId: "1:309372653282:web:01debfc2f683df49d658bb",
  measurementId: "G-QD03Y5R4JS"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

const initAnalytics = async () => {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getAnalytics(app);
};

export { app, db, auth, initAnalytics };
