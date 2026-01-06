/**
 * Application constants
 */

export const API_ROUTES = {
  RESERVATIONS: '/api/reservations',
  ADMIN_RESERVATIONS: '/api/admin/reservations',
  ADMIN_AVAILABILITY: '/api/admin/availability',
  ADMIN_PRICES: '/api/admin/prices',
  ADMIN_VOUCHERS: '/api/admin/vouchers',
  ADMIN_ANALYTICS: '/api/admin/analytics',
  AUTH_LOGIN: '/api/auth/login',
} as const;

export const ROUTES = {
  HOME: '/',
  ADMIN_LOGIN: '/admin/login',
  ADMIN_DASHBOARD: '/admin/dashboard',
} as const;

export const STORAGE_KEYS = {
  ADMIN_TOKEN: 'adminToken',
  ADMIN_EMAIL: 'adminEmail',
} as const;

export const RESERVATION_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export const AVAILABILITY_STATUS = {
  BLOCKED: 'blocked',
  AVAILABLE: 'available',
  OVERRIDE_PRICE: 'override-price',
} as const;

export const VOUCHER_TYPES = {
  PERCENTAGE: 'percentage',
  FIXED: 'fixed',
} as const;

export const CHART_COLORS = {
  PRIMARY: '#f97316',
  SECONDARY: '#dc2626',
  ACCENT: '#b45309',
  INFO: '#3b82f6',
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  DANGER: '#ef4444',
} as const;

export const MIN_BOOKING_NIGHTS = 1;
export const MAX_BOOKING_NIGHTS = 30;
export const DEFAULT_GUESTS = 1;
export const MAX_GUESTS = 10;
