export type TrackingConsentStatus = 'granted' | 'denied' | 'unknown';

const TRACKING_CONSENT_KEY = 'enzoloft_tracking_consent';
export const TRACKING_CONSENT_CHANGED_EVENT = 'enzoloft:tracking-consent-changed';
let inMemoryConsentStatus: TrackingConsentStatus = 'unknown';

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

  try {
    const stored = window.localStorage.getItem(TRACKING_CONSENT_KEY);
    if (stored === 'granted' || stored === 'denied') {
      inMemoryConsentStatus = stored;
      return stored;
    }
  } catch {
    // localStorage can fail in privacy modes, continue with fallback
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

  try {
    window.localStorage.setItem(TRACKING_CONSENT_KEY, status);
  } catch {
    // localStorage unavailable, fallback cookie/in-memory still works
  }

  saveConsentToCookie(status);
  window.dispatchEvent(new CustomEvent(TRACKING_CONSENT_CHANGED_EVENT, { detail: { status } }));
};
