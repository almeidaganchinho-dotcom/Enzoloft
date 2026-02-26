import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { hasTrackingConsent } from './consent';

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
let analyticsPromise: ReturnType<typeof initAnalytics> | null = null;

const initAnalytics = async () => {
  if (typeof window === 'undefined') return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getAnalytics(app);
};

const trackAnalyticsEvent = async (
  eventName: string,
  params?: Record<string, string | number | boolean | null | undefined>
) => {
  try {
    if (!hasTrackingConsent()) {
      return;
    }

    if (!analyticsPromise) {
      analyticsPromise = initAnalytics();
    }

    const analytics = await analyticsPromise;
    if (!analytics) return;

    const eventParams = Object.entries(params || {}).reduce<Record<string, string | number | boolean>>((accumulator, [key, value]) => {
      if (value !== undefined && value !== null) {
        accumulator[key] = value;
      }
      return accumulator;
    }, {});

    logEvent(analytics, eventName, eventParams);
  } catch (error) {
    console.error('Erro ao registar evento GA4:', error);
  }
};

export { app, db, auth, initAnalytics, trackAnalyticsEvent };
