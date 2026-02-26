export type TrackingConsentStatus = 'granted' | 'denied' | 'unknown';

const TRACKING_CONSENT_KEY = 'enzoloft_tracking_consent';

export const getTrackingConsentStatus = (): TrackingConsentStatus => {
  if (typeof window === 'undefined') return 'unknown';

  const stored = window.localStorage.getItem(TRACKING_CONSENT_KEY);
  if (stored === 'granted' || stored === 'denied') {
    return stored;
  }

  return 'unknown';
};

export const hasTrackingConsent = (): boolean => {
  return getTrackingConsentStatus() === 'granted';
};

export const setTrackingConsentStatus = (status: Exclude<TrackingConsentStatus, 'unknown'>) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TRACKING_CONSENT_KEY, status);
};
