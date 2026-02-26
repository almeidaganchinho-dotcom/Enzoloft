export type TrackingConsentStatus = 'granted' | 'denied' | 'unknown';

const TRACKING_CONSENT_KEY = 'enzoloft_tracking_consent';
export const TRACKING_CONSENT_CHANGED_EVENT = 'enzoloft:tracking-consent-changed';
let inMemoryConsentStatus: TrackingConsentStatus = 'unknown';

const getFromStorage = (storageType: 'localStorage' | 'sessionStorage'): TrackingConsentStatus => {
  if (typeof window === 'undefined') return 'unknown';

  try {
    const value = window[storageType].getItem(TRACKING_CONSENT_KEY);
    if (value === 'granted' || value === 'denied') {
      return value;
    }
  } catch {
    // Ignore storage access errors
  }

  return 'unknown';
};

const saveToStorage = (storageType: 'localStorage' | 'sessionStorage', status: Exclude<TrackingConsentStatus, 'unknown'>) => {
  if (typeof window === 'undefined') return;

  try {
    window[storageType].setItem(TRACKING_CONSENT_KEY, status);
  } catch {
    // Ignore storage access errors
  }
};

const getConsentFromCookie = (): TrackingConsentStatus => {
  if (typeof document === 'undefined') return 'unknown';

  const cookieItem = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${TRACKING_CONSENT_KEY}=`));

  if (!cookieItem) return 'unknown';

  const cookieValue = decodeURIComponent(cookieItem.split('=').slice(1).join('='));
  if (cookieValue === 'granted' || cookieValue === 'denied') {
    return cookieValue;
  }

  return 'unknown';
};

const saveConsentToCookie = (status: Exclude<TrackingConsentStatus, 'unknown'>) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${TRACKING_CONSENT_KEY}=${encodeURIComponent(status)}; path=/; max-age=31536000; samesite=lax`;
};

export const getTrackingConsentStatus = (): TrackingConsentStatus => {
  if (typeof window === 'undefined') return 'unknown';

  const localStorageConsent = getFromStorage('localStorage');
  if (localStorageConsent !== 'unknown') {
    inMemoryConsentStatus = localStorageConsent;
    return localStorageConsent;
  }

  const sessionStorageConsent = getFromStorage('sessionStorage');
  if (sessionStorageConsent !== 'unknown') {
    inMemoryConsentStatus = sessionStorageConsent;
    return sessionStorageConsent;
  }

  const cookieConsent = getConsentFromCookie();
  if (cookieConsent !== 'unknown') {
    inMemoryConsentStatus = cookieConsent;
    return cookieConsent;
  }

  return inMemoryConsentStatus;
};

export const hasTrackingConsent = (): boolean => {
  return getTrackingConsentStatus() === 'granted';
};

export const setTrackingConsentStatus = (status: Exclude<TrackingConsentStatus, 'unknown'>) => {
  if (typeof window === 'undefined') return;
  inMemoryConsentStatus = status;

  saveToStorage('localStorage', status);
  saveToStorage('sessionStorage', status);

  saveConsentToCookie(status);

  try {
    window.dispatchEvent(new Event(TRACKING_CONSENT_CHANGED_EVENT));
  } catch {
    // Ignore dispatch errors
  }
};
