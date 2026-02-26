import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { hasTrackingConsent } from './consent';

interface MonitoringPayload {
  event: string;
  level?: 'info' | 'warning' | 'error';
  context?: Record<string, unknown>;
}

const sanitizeContext = (context?: Record<string, unknown>) => {
  if (!context) return {};

  const entries = Object.entries(context)
    .slice(0, 20)
    .map(([key, value]) => {
      if (value === undefined || value === null) return [key, null];
      if (typeof value === 'string') return [key, value.slice(0, 500)];
      if (typeof value === 'number' || typeof value === 'boolean') return [key, value];
      return [key, JSON.stringify(value).slice(0, 500)];
    });

  return Object.fromEntries(entries);
};

export const logClientEvent = async ({ event, level = 'info', context }: MonitoringPayload) => {
  try {
    if (!hasTrackingConsent()) {
      return;
    }

    await addDoc(collection(db, 'clientEvents'), {
      event,
      level,
      context: sanitizeContext(context),
      path: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      createdAt: serverTimestamp(),
    });
  } catch {
    // Avoid breaking UX if telemetry fails.
  }
};

export const logClientError = async (event: string, error: unknown, context?: Record<string, unknown>) => {
  await logClientEvent({
    event,
    level: 'error',
    context: {
      ...context,
      error: error instanceof Error ? error.message : String(error),
    },
  });
};
