import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

const COUNTRIES = [
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dialCode: '+351' },
  { code: 'ES', flag: '🇪🇸', name: 'Espanha', dialCode: '+34' },
  { code: 'FR', flag: '🇫🇷', name: 'França', dialCode: '+33' },
  { code: 'DE', flag: '🇩🇪', name: 'Alemanha', dialCode: '+49' },
  { code: 'GB', flag: '🇬🇧', name: 'Reino Unido', dialCode: '+44' },
  { code: 'IT', flag: '🇮🇹', name: 'Itália', dialCode: '+39' },
  { code: 'NL', flag: '🇳🇱', name: 'Países Baixos', dialCode: '+31' },
  { code: 'BE', flag: '🇧🇪', name: 'Bélgica', dialCode: '+32' },
  { code: 'CH', flag: '🇨🇭', name: 'Suíça', dialCode: '+41' },
  { code: 'AT', flag: '🇦🇹', name: 'Áustria', dialCode: '+43' },
  { code: 'SE', flag: '🇸🇪', name: 'Suécia', dialCode: '+46' },
  { code: 'NO', flag: '🇳🇴', name: 'Noruega', dialCode: '+47' },
  { code: 'DK', flag: '🇩🇰', name: 'Dinamarca', dialCode: '+45' },
  { code: 'FI', flag: '🇫🇮', name: 'Finlândia', dialCode: '+358' },
  { code: 'PL', flag: '🇵🇱', name: 'Polónia', dialCode: '+48' },
  { code: 'CZ', flag: '🇨🇿', name: 'República Checa', dialCode: '+420' },
  { code: 'RO', flag: '🇷🇴', name: 'Roménia', dialCode: '+40' },
  { code: 'GR', flag: '🇬🇷', name: 'Grécia', dialCode: '+30' },
  { code: 'IE', flag: '🇮🇪', name: 'Irlanda', dialCode: '+353' },
  { code: 'LU', flag: '🇱🇺', name: 'Luxemburgo', dialCode: '+352' },
  { code: 'BR', flag: '🇧🇷', name: 'Brasil', dialCode: '+55' },
  { code: 'US', flag: '🇺🇸', name: 'Estados Unidos', dialCode: '+1' },
  { code: 'CA', flag: '🇨🇦', name: 'Canadá', dialCode: '+1' },
  { code: 'AU', flag: '🇦🇺', name: 'Austrália', dialCode: '+61' },
  { code: 'MX', flag: '🇲🇽', name: 'México', dialCode: '+52' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina', dialCode: '+54' },
  { code: 'ZA', flag: '🇿🇦', name: 'África do Sul', dialCode: '+27' },
  { code: 'AO', flag: '🇦🇴', name: 'Angola', dialCode: '+244' },
  { code: 'MZ', flag: '🇲🇿', name: 'Moçambique', dialCode: '+258' },
  { code: 'CV', flag: '🇨🇻', name: 'Cabo Verde', dialCode: '+238' },
  { code: 'CN', flag: '🇨🇳', name: 'China', dialCode: '+86' },
  { code: 'JP', flag: '🇯🇵', name: 'Japão', dialCode: '+81' },
  { code: 'IN', flag: '🇮🇳', name: 'Índia', dialCode: '+91' },
];

function renderFormattedText(text: string): React.ReactNode {
  return text.split('\n').map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return (
      <React.Fragment key={i}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={j}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}
        {i < arr.length - 1 && <br />}
      </React.Fragment>
    );
  });
}
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { db, trackAnalyticsEvent } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { logClientError, logClientEvent } from '../lib/monitoring';

const PresentationModePage = dynamic(() => import('../components/PresentationModePage'));

interface BlockedDate {
  startDate: string;
  endDate: string;
  status: string;
}

interface Price {
  id: string;
  season: string;
  description?: string;
  pricePerNight: number;
  startDate: string;
  endDate: string;
}

interface Voucher {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  expiryDate: string;
}

interface FormData {
  propertyId: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests: string;
  startDate: string;
  endDate: string;
  guestsCount: number;
  totalPrice: number;
}

interface PriceCalculationResult {
  totalPrice: number;
  priceOnRequest: boolean;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

interface SiteMode {
  presentationModeEnabled?: boolean;
  hideContactForm?: boolean;
}

interface SiteStats {
  totalVisits?: number;
  lastVisitAt?: string;
}

interface GeoLookupResponse {
  success?: boolean;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

interface GeoPayload {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
}

const defaultGeoPayload: GeoPayload = {
  country: 'Desconhecido',
  countryCode: '',
  region: '',
  city: 'Desconhecido',
  latitude: 0,
  longitude: 0,
};

const isValidCoordinates = (latitude: number, longitude: number) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  return true;
};

const fetchGeoPayload = async (): Promise<GeoPayload> => {
  try {
    const ipWhoResponse = await fetch('https://ipwho.is/', { method: 'GET' });
    const ipWhoData = (await ipWhoResponse.json()) as GeoLookupResponse;

    const ipWhoLatitude = Number(ipWhoData.latitude || 0);
    const ipWhoLongitude = Number(ipWhoData.longitude || 0);
    if (ipWhoData.success !== false && isValidCoordinates(ipWhoLatitude, ipWhoLongitude)) {
      return {
        country: ipWhoData.country || 'Desconhecido',
        countryCode: ipWhoData.country_code || '',
        region: ipWhoData.region || '',
        city: ipWhoData.city || 'Desconhecido',
        latitude: ipWhoLatitude,
        longitude: ipWhoLongitude,
      };
    }
  } catch {
    // Try next provider
  }

  try {
    const ipApiCoResponse = await fetch('https://ipapi.co/json/', { method: 'GET' });
    const ipApiCoData = (await ipApiCoResponse.json()) as {
      country_name?: string;
      country_code?: string;
      region?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
    };

    const ipApiLatitude = Number(ipApiCoData.latitude || 0);
    const ipApiLongitude = Number(ipApiCoData.longitude || 0);
    if (isValidCoordinates(ipApiLatitude, ipApiLongitude)) {
      return {
        country: ipApiCoData.country_name || 'Desconhecido',
        countryCode: ipApiCoData.country_code || '',
        region: ipApiCoData.region || '',
        city: ipApiCoData.city || 'Desconhecido',
        latitude: ipApiLatitude,
        longitude: ipApiLongitude,
      };
    }
  } catch {
    // Keep default payload
  }

  return defaultGeoPayload;
};

const detectDeviceType = (userAgent: string): 'mobile' | 'tablet' | 'desktop' => {
  const ua = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk|kindle/.test(ua)) {
    return 'tablet';
  }

  if (/mobile|android|iphone|ipod|blackberry|windows phone|opera mini/.test(ua)) {
    return 'mobile';
  }

  return 'desktop';
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const toUtcDateValue = (dateKey: string): number => {
  const [year, month, day] = dateKey.split('-').map(Number);
  if (!year || !month || !day) return Number.NaN;
  return Date.UTC(year, month - 1, day);
};

const formatDateKeyFromUtcValue = (utcValue: number): string => {
  const date = new Date(utcValue);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getNightsBetween = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;

  const startUtc = toUtcDateValue(startDate);
  const endUtc = toUtcDateValue(endDate);

  if (Number.isNaN(startUtc) || Number.isNaN(endUtc) || endUtc <= startUtc) {
    return 0;
  }

  return Math.floor((endUtc - startUtc) / (1000 * 60 * 60 * 24));
};

export default function Home() {
  const siteBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://enzoloft.pt').replace(/\/$/, '');
  const canonicalUrl = siteBaseUrl;
  const siteTitle = 'EnzoLoft - Alojamento de Charme em Vila Ruiva, Cuba - Beja';
  const siteDescription = 'Retiro de charme no coração do Alentejo. Reserve agora o seu alojamento exclusivo em Vila Ruiva, Cuba - Beja. Casa completa com tanque alentejano e vistas deslumbrantes.';
  const ogImageVersion = process.env.NEXT_PUBLIC_OG_IMAGE_VERSION || '20260227';
  const ogImageUrl = `${siteBaseUrl}/og-image.jpg?v=${ogImageVersion}`;
  const emailApiUrl = process.env.NEXT_PUBLIC_EMAIL_API_URL;
  const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;
  const bingSiteVerification = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION;

  const [formData, setFormData] = useState<FormData>({
    propertyId: '1',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    specialRequests: '',
    startDate: '',
    endDate: '',
    guestsCount: 1,
    totalPrice: 0,
  });
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [reservedDates, setReservedDates] = useState<{startDate: string, endDate: string}[]>([]);
  const [priceRules, setPriceRules] = useState<Price[]>([]);
  const [dateError, setDateError] = useState<string>('');
  const [nights, setNights] = useState<number>(0);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [priceOnRequest, setPriceOnRequest] = useState<boolean>(false);
  const [showFormCalendar, setShowFormCalendar] = useState<boolean>(false);
  const [formCalendarMonth, setFormCalendarMonth] = useState<Date>(new Date());
  const [showAmenitiesModal, setShowAmenitiesModal] = useState<boolean>(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [presentationModeEnabled, setPresentationModeEnabled] = useState<boolean>(false);
  const [hideContactForm, setHideContactForm] = useState<boolean>(false);
  const [siteModeLoaded, setSiteModeLoaded] = useState<boolean>(false);
  const [bookingStarted, setBookingStarted] = useState<boolean>(false);
  const [submittingReservation, setSubmittingReservation] = useState<boolean>(false);
  const [contactFormData, setContactFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [submittingContact, setSubmittingContact] = useState<boolean>(false);
  const [contactFormMessage, setContactFormMessage] = useState<string>('');
  const [showMobileMenu, setShowMobileMenu] = useState<boolean>(false);
  const [showMobileBookingForm, setShowMobileBookingForm] = useState<boolean>(false);
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>('PT');
  const [phoneLocalNumber, setPhoneLocalNumber] = useState<string>('');
  const bookingStartedRef = useRef(false);
  const [pageTexts, setPageTexts] = useState({
    heroTitle: 'Retiro Perfeito no Alentejo',
    heroSubtitle: 'Alojamento de charme em Vila Ruiva, Cuba - Beja',
    aboutTitle: 'Sobre o EnzoLoft',
    aboutParagraph1: 'Um refúgio encantador no coração do Alentejo, onde a natureza, conforto e charme se encontram. Perfeito para casais, famílias ou amigos que procuram descanso e autenticidade.',
    aboutTitle2: '',
    aboutParagraph2: '',
  });
  const [contactInfo, setContactInfo] = useState({
    location: 'Vila Ruiva, Cuba - Beja',
    email: 'info@enzoloft.com',
    phone: '+351 XXX XXX XXX',
    description: 'Retiro de charme no coração do Alentejo',
    mapsUrl: ''
  });

  const deferredSectionStyle = useMemo<React.CSSProperties>(() => ({
    contentVisibility: 'auto',
    containIntrinsicSize: '1px 1000px',
  }), []);

  const liveNights = useMemo(
    () => getNightsBetween(formData.startDate, formData.endDate),
    [formData.startDate, formData.endDate]
  );

  const dateSelectionStepLabel = useMemo(() => {
    if (!formData.startDate) return 'Passo 1: selecione o check-in';
    if (!formData.endDate) return 'Passo 2: selecione o check-out';
    return 'Datas selecionadas';
  }, [formData.endDate, formData.startDate]);

  useEffect(() => {
    setNights(liveNights);
  }, [liveNights]);

  useEffect(() => {
    const registerVisit = async () => {
      if (typeof window === 'undefined') return;

      const visitStorageKey = 'enzoloft_visit_counted';
      if (sessionStorage.getItem(visitStorageKey) === '1') {
        return;
      }

      const userAgent = window.navigator.userAgent || '';
      const platform = window.navigator.platform || '';
      const deviceType = detectDeviceType(userAgent);

      try {
        const siteStatsRef = doc(db, 'settings', 'siteStats');
        await runTransaction(db, async (transaction) => {
          const siteStatsDoc = await transaction.get(siteStatsRef);
          const currentData = siteStatsDoc.exists() ? (siteStatsDoc.data() as SiteStats) : {};
          const currentVisits = Number(currentData.totalVisits || 0);

          transaction.set(
            siteStatsRef,
            {
              totalVisits: currentVisits + 1,
              lastVisitAt: new Date().toISOString(),
            },
            { merge: true }
          );
        });

        try {
          const geoData = await fetchGeoPayload();

          await addDoc(collection(db, 'visitEvents'), {
            source: 'homepage',
            country: geoData.country,
            countryCode: geoData.countryCode,
            region: geoData.region,
            city: geoData.city,
            latitude: geoData.latitude,
            longitude: geoData.longitude,
            deviceType,
            userAgent,
            platform,
            createdAt: serverTimestamp(),
            createdAtIso: new Date().toISOString(),
          });
        } catch (geoError) {
          await logClientError('homepage_visit_geo_lookup_failed', geoError);
          await addDoc(collection(db, 'visitEvents'), {
            source: 'homepage',
            country: 'Desconhecido',
            countryCode: '',
            region: '',
            city: 'Desconhecido',
            latitude: 0,
            longitude: 0,
            deviceType,
            userAgent,
            platform,
            createdAt: serverTimestamp(),
            createdAtIso: new Date().toISOString(),
          });
        } finally {
          sessionStorage.setItem(visitStorageKey, '1');
        }
      } catch (error) {
        console.error('Erro ao registar visita:', error);
        await logClientError('homepage_visit_register_failed', error);
      }
    };

    registerVisit();
  }, []);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Carregar tudo em paralelo para melhor performance
        const [availabilitySnapshot, reservationsSnapshot, pricesSnapshot, contactDoc, siteModeDoc] = await Promise.all([
          getDocs(collection(db, 'availability')),
          getDocs(query(collection(db, 'reservations'), where('status', '==', 'confirmed'))),
          getDocs(collection(db, 'prices')),
          getDoc(doc(db, 'settings', 'contactInfo')),
          getDoc(doc(db, 'settings', 'siteMode'))
        ]);
        
        // Datas bloqueadas
        const blockedData = availabilitySnapshot.docs.map(doc => doc.data() as BlockedDate);
        setBlockedDates(blockedData);
        
        // Reservas confirmadas (fallback para dados legados)
        const confirmedReservations = reservationsSnapshot.docs
          .map(doc => doc.data())
          .map(res => ({
            startDate: res.startDate,
            endDate: res.endDate
          }));
        let mergedReservations = [...confirmedReservations];

        // Locks públicos de reserva (pending + confirmed)
        try {
          const reservationLocksSnapshot = await getDocs(
            query(collection(db, 'reservationLocks'), where('status', 'in', ['pending', 'confirmed']))
          );

          const reservationLocks = reservationLocksSnapshot.docs
            .map((lockDoc) => lockDoc.data())
            .map((lock) => ({
              startDate: lock.startDate,
              endDate: lock.endDate,
            }));

          mergedReservations = [...mergedReservations, ...reservationLocks];
        } catch (lockError) {
          await logClientError('homepage_reservation_locks_load_failed', lockError);
        }

        const uniqueReservations = Array.from(
          new Map(
            mergedReservations.map((reservation) => [
              `${reservation.startDate}_${reservation.endDate}`,
              reservation,
            ])
          ).values()
        );

        setReservedDates(uniqueReservations);

        const pricesData = pricesSnapshot.docs.map(priceDoc => ({ id: priceDoc.id, ...priceDoc.data() } as Price));
        setPriceRules(pricesData);
        
        // Informações de contacto
        if (contactDoc.exists()) {
          setContactInfo(contactDoc.data() as any);
        }

        const pageTextsDoc = await getDoc(doc(db, 'settings', 'pageTexts'));
        if (pageTextsDoc.exists()) {
          setPageTexts((prev) => ({ ...prev, ...(pageTextsDoc.data() as any) }));
        }

        if (siteModeDoc.exists()) {
          const siteModeData = siteModeDoc.data() as SiteMode;
          setPresentationModeEnabled(Boolean(siteModeData.presentationModeEnabled));
          setHideContactForm(Boolean(siteModeData.hideContactForm));
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        await logClientError('homepage_initial_load_failed', error);
      } finally {
        setSiteModeLoaded(true);
      }
    };
    
    loadAllData();
  }, []);

  const isDateBlocked = useCallback((date: string): boolean => {
    const checkDateUtc = toUtcDateValue(date);
    if (Number.isNaN(checkDateUtc)) return false;

    return blockedDates.some(block => {
      const blockStartUtc = toUtcDateValue(block.startDate);
      const blockEndUtc = toUtcDateValue(block.endDate);
      if (Number.isNaN(blockStartUtc) || Number.isNaN(blockEndUtc)) return false;
      return checkDateUtc >= blockStartUtc && checkDateUtc <= blockEndUtc && block.status === 'blocked';
    });
  }, [blockedDates]);

  const isDateReserved = useCallback((date: string): boolean => {
    const checkDateUtc = toUtcDateValue(date);
    if (Number.isNaN(checkDateUtc)) return false;

    return reservedDates.some(res => {
      const resStartUtc = toUtcDateValue(res.startDate);
      const resEndUtc = toUtcDateValue(res.endDate);
      if (Number.isNaN(resStartUtc) || Number.isNaN(resEndUtc)) return false;
      return checkDateUtc >= resStartUtc && checkDateUtc <= resEndUtc;
    });
  }, [reservedDates]);

  const getNightlyPrice = useCallback((dateStr: string): number | null => {
    const applicablePrice = priceRules.find((priceRule) => {
      const priceStart = new Date(`${priceRule.startDate}T00:00:00`);
      const priceEnd = new Date(`${priceRule.endDate}T00:00:00`);
      const checkDate = new Date(`${dateStr}T00:00:00`);
      return checkDate >= priceStart && checkDate <= priceEnd;
    });

    return applicablePrice ? Number(applicablePrice.pricePerNight) : null;
  }, [priceRules]);

  const checkDateRangeConflict = useCallback((start: string, end: string): { hasConflict: boolean; message: string } => {
    if (!start || !end) return { hasConflict: false, message: '' };
    
    const startUtc = toUtcDateValue(start);
    const endUtc = toUtcDateValue(end);
    
    if (Number.isNaN(startUtc) || Number.isNaN(endUtc) || endUtc <= startUtc) {
      return { hasConflict: true, message: '❌ A data de check-out deve ser posterior à data de check-in.' };
    }
    
    const oneDayMs = 1000 * 60 * 60 * 24;
    
    for (let currentUtc = startUtc; currentUtc <= endUtc; currentUtc += oneDayMs) {
      const dateStr = formatDateKeyFromUtcValue(currentUtc);
      
      if (isDateBlocked(dateStr)) {
        return { hasConflict: true, message: '❌ Uma ou mais datas selecionadas estão bloqueadas pelo administrador.' };
      }
      
      if (isDateReserved(dateStr)) {
        return { hasConflict: true, message: '❌ Uma ou mais datas selecionadas já estão reservadas. Escolha outras datas.' };
      }
    }
    
    return { hasConflict: false, message: '' };
  }, [isDateBlocked, isDateReserved]);
  const applyVoucher = useCallback(async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Por favor, insira um código de voucher.');
      void trackAnalyticsEvent('voucher_apply_failed', { reason: 'empty_code' });
      return;
    }

    if (priceOnRequest) {
      setVoucherError('Para este período, o preço está sob consulta e não permite voucher.');
      void trackAnalyticsEvent('voucher_apply_failed', { reason: 'price_on_request' });
      return;
    }

    const currentPrice = originalPrice > 0 ? originalPrice : formData.totalPrice;
    
    if (currentPrice === 0) {
      setVoucherError('Selecione as datas primeiro para aplicar o voucher.');
      void trackAnalyticsEvent('voucher_apply_failed', { reason: 'missing_dates_or_price' });
      return;
    }

    try {
      const vouchersSnapshot = await getDocs(collection(db, 'vouchers'));
      const vouchers = vouchersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Voucher));
      
      const voucher = vouchers.find(v => v.code?.trim().toUpperCase() === voucherCode.trim().toUpperCase());
      
      if (!voucher) {
        setVoucherError('Voucher inválido.');
        setAppliedVoucher(null);
        setDiscount(0);
        setFormData(prev => ({ ...prev, totalPrice: currentPrice }));
        void trackAnalyticsEvent('voucher_apply_failed', { reason: 'invalid_code' });
        return;
      }
      
      // Verificar se o voucher expirou
      const today = new Date();
      const expiryDate = new Date(voucher.expiryDate);
      if (today > expiryDate) {
        setVoucherError('Este voucher expirou.');
        setAppliedVoucher(null);
        setDiscount(0);
        setFormData(prev => ({ ...prev, totalPrice: currentPrice }));
        void trackAnalyticsEvent('voucher_apply_failed', { reason: 'expired' });
        return;
      }
      
      // Salvar preço original se ainda não foi salvo
      if (originalPrice === 0) {
        setOriginalPrice(currentPrice);
      }
      
      // Calcular desconto
      let discountAmount = 0;
      if (voucher.type === 'percentage') {
        discountAmount = (currentPrice * voucher.value) / 100;
      } else {
        discountAmount = voucher.value;
      }
      
      // Não permitir desconto maior que o preço
      if (discountAmount > currentPrice) {
        discountAmount = currentPrice;
      }
      
      setAppliedVoucher(voucher);
      setDiscount(discountAmount);
      setFormData(prev => ({ ...prev, totalPrice: currentPrice - discountAmount }));
      setVoucherError('');
      setMessage(`✅ Voucher "${voucher.code}" aplicado com sucesso!`);
      void trackAnalyticsEvent('voucher_applied', {
        voucher_type: voucher.type,
        discount_amount: Number(discountAmount.toFixed(2)),
        original_price: Number(currentPrice.toFixed(2)),
        final_price: Number((currentPrice - discountAmount).toFixed(2)),
      });
    } catch (error) {
      console.error('Erro ao validar voucher:', error);
      await logClientError('booking_voucher_validation_failed', error, { voucherCode });
      setVoucherError('Erro ao validar voucher. Tente novamente.');
      void trackAnalyticsEvent('voucher_apply_failed', { reason: 'exception' });
    }
  }, [voucherCode, originalPrice, formData.totalPrice, priceOnRequest]);
  const calculateTotalPrice = useCallback(async (startDate: string, endDate: string): Promise<PriceCalculationResult> => {
    if (!startDate || !endDate) return { totalPrice: 0, priceOnRequest: false };

    const nightsCount = getNightsBetween(startDate, endDate);
    if (nightsCount <= 0) return { totalPrice: 0, priceOnRequest: false };

    const start = new Date(`${startDate}T00:00:00`);
    setNights(nightsCount);

    try {
      if (priceRules.length === 0) {
        setOriginalPrice(0);
        setDiscount(0);
        return { totalPrice: 0, priceOnRequest: true };
      }

      let totalPrice = 0;

      // Se alguma noite não tiver preço definido, fica sob consulta para todo o período.
      let currentDate = new Date(start);
      for (let i = 0; i < nightsCount; i++) {
        const dateStr = formatDateKey(currentDate);
        const nightlyPrice = getNightlyPrice(dateStr);

        if (nightlyPrice === null) {
          setOriginalPrice(0);
          setDiscount(0);
          return { totalPrice: 0, priceOnRequest: true };
        }

        totalPrice += nightlyPrice;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      setOriginalPrice(totalPrice);

      if (appliedVoucher) {
        let discountAmount = 0;
        if (appliedVoucher.type === 'percentage') {
          discountAmount = (totalPrice * appliedVoucher.value) / 100;
        } else {
          discountAmount = appliedVoucher.value;
        }
        if (discountAmount > totalPrice) {
          discountAmount = totalPrice;
        }
        setDiscount(discountAmount);
        return { totalPrice: totalPrice - discountAmount, priceOnRequest: false };
      }

      return { totalPrice, priceOnRequest: false };
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      await logClientError('booking_price_calculation_failed', error, { startDate, endDate });
      setOriginalPrice(0);
      setDiscount(0);
      return { totalPrice: 0, priceOnRequest: true };
    }
  }, [appliedVoucher, getNightlyPrice, priceRules]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (!bookingStartedRef.current) {
      bookingStartedRef.current = true;
      setBookingStarted(true);
      await logClientEvent({ event: 'booking_started', context: { field: name } });
      void trackAnalyticsEvent('booking_started', { source: 'form_field', field: name });
    }

    if (name !== 'startDate' && name !== 'endDate') {
      setFormData(prev => ({ ...prev, [name]: value }));
      return;
    }

    let nextStartDate = name === 'startDate' ? value : formData.startDate;
    let nextEndDate = name === 'endDate' ? value : formData.endDate;

    // Não permitir checkout anterior/igual ao checkin
    if (name === 'endDate' && nextStartDate && nextEndDate && nextEndDate <= nextStartDate) {
      setDateError('❌ A data de check-out deve ser posterior à data de check-in.');
      setFormData(prev => ({ ...prev, endDate: '', totalPrice: 0 }));
      setNights(0);
      setPriceOnRequest(false);
      return;
    }

    // Mínimo de 2 noites
    if (name === 'endDate' && nextStartDate && nextEndDate) {
      const diffDays = Math.ceil((new Date(nextEndDate).getTime() - new Date(nextStartDate).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 2) {
        setDateError('❌ A estadia mínima é de 2 noites.');
        setFormData(prev => ({ ...prev, endDate: '', totalPrice: 0 }));
        setNights(0);
        setPriceOnRequest(false);
        return;
      }
    }

    // Se o checkin avançar para depois do checkout atual, limpar checkout
    if (name === 'startDate' && nextEndDate && nextEndDate <= nextStartDate) {
      nextEndDate = '';
    }

    setDateError('');
    setFormData(prev => ({
      ...prev,
      startDate: nextStartDate,
      endDate: nextEndDate,
      totalPrice: nextStartDate && nextEndDate ? prev.totalPrice : 0,
    }));

    if (nextStartDate && nextEndDate) {
      const conflict = checkDateRangeConflict(nextStartDate, nextEndDate);

      if (conflict.hasConflict) {
        setDateError(conflict.message);
        setFormData(prev => ({ ...prev, totalPrice: 0 }));
        setNights(0);
        setPriceOnRequest(false);
      } else {
        const calculation = await calculateTotalPrice(nextStartDate, nextEndDate);
        setPriceOnRequest(calculation.priceOnRequest);
        if (calculation.priceOnRequest) {
          setAppliedVoucher(null);
          setVoucherCode('');
          setDiscount(0);
          setVoucherError('');
        }
        setFormData(prev => ({ ...prev, totalPrice: calculation.totalPrice }));
      }
    } else {
      setNights(0);
      setPriceOnRequest(false);
    }
  }, [formData.startDate, formData.endDate, checkDateRangeConflict, calculateTotalPrice]);

  const handleDateSelect = useCallback(async (dateStr: string, type: 'start' | 'end') => {
    if (!bookingStartedRef.current) {
      bookingStartedRef.current = true;
      setBookingStarted(true);
      await logClientEvent({ event: 'booking_started', context: { field: 'calendar' } });
      void trackAnalyticsEvent('booking_started', { source: 'calendar' });
    }

    const newFormData = { ...formData };
    
    if (type === 'start') {
      newFormData.startDate = dateStr;
      // Se já existir endDate e for anterior ao novo startDate, limpar
      if (newFormData.endDate && newFormData.endDate <= dateStr) {
        newFormData.endDate = '';
      }
    } else {
      if (newFormData.startDate && dateStr <= newFormData.startDate) {
        setDateError('❌ A data de check-out deve ser posterior à data de check-in.');
        return;
      }
      if (newFormData.startDate) {
        const diffDays = Math.ceil((new Date(dateStr).getTime() - new Date(newFormData.startDate).getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 2) {
          setDateError('❌ A estadia mínima é de 2 noites.');
          return;
        }
      }
      newFormData.endDate = dateStr;
    }
    
    setFormData(newFormData);
    setDateError('');
    
    // Verificar conflitos e calcular preço se ambas as datas estiverem selecionadas
    if (newFormData.startDate && newFormData.endDate) {
      const conflict = checkDateRangeConflict(newFormData.startDate, newFormData.endDate);
      
      if (conflict.hasConflict) {
        setDateError(conflict.message);
        setFormData(prev => ({ ...prev, totalPrice: 0 }));
        setNights(0);
        setPriceOnRequest(false);
      } else {
        const calculation = await calculateTotalPrice(newFormData.startDate, newFormData.endDate);
        setPriceOnRequest(calculation.priceOnRequest);
        if (calculation.priceOnRequest) {
          setAppliedVoucher(null);
          setVoucherCode('');
          setDiscount(0);
          setVoucherError('');
        }
        setFormData(prev => ({ ...prev, totalPrice: calculation.totalPrice }));
        setShowFormCalendar(false);
        await logClientEvent({
          event: 'booking_dates_selected',
          context: {
            startDate: newFormData.startDate,
            endDate: newFormData.endDate,
            totalPrice: calculation.totalPrice,
            priceOnRequest: calculation.priceOnRequest,
          },
        });
        void trackAnalyticsEvent('booking_dates_selected', {
          total_price: Number(calculation.totalPrice.toFixed(2)),
          price_on_request: calculation.priceOnRequest,
        });
      }
    } else {
      setPriceOnRequest(false);
    }
  }, [formData, checkDateRangeConflict, calculateTotalPrice]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmittingReservation(true);
    setMessage('');

    // Validações básicas
    if (dateError) {
      await logClientEvent({ event: 'booking_submit_blocked', level: 'warning', context: { reason: 'date_error' } });
      void trackAnalyticsEvent('booking_submit_blocked', { reason: 'date_error' });
      setMessage('❌ Por favor, escolha datas válidas sem bloqueios.');
      setLoading(false);
      setSubmittingReservation(false);
      return;
    }

    if (!formData.guestName.trim() || formData.guestName.length < 3) {
      void trackAnalyticsEvent('booking_submit_blocked', { reason: 'invalid_name' });
      setMessage('❌ Por favor, insira um nome válido (mínimo 3 caracteres).');
      setLoading(false);
      setSubmittingReservation(false);
      return;
    }

    if (!formData.guestEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      void trackAnalyticsEvent('booking_submit_blocked', { reason: 'invalid_email' });
      setMessage('❌ Por favor, insira um email válido.');
      setLoading(false);
      setSubmittingReservation(false);
      return;
    }

    if (!formData.guestPhone.trim() || formData.guestPhone.length < 9) {
      void trackAnalyticsEvent('booking_submit_blocked', { reason: 'invalid_phone' });
      setMessage('❌ Por favor, insira um telefone válido.');
      setLoading(false);
      setSubmittingReservation(false);
      return;
    }

    if (formData.guestsCount < 1 || formData.guestsCount > 5) {
      void trackAnalyticsEvent('booking_submit_blocked', { reason: 'invalid_guests_count' });
      setMessage('❌ Número de hóspedes inválido (1-5).');
      setLoading(false);
      setSubmittingReservation(false);
      return;
    }

    void trackAnalyticsEvent('booking_submit_attempt', {
      guests_count: formData.guestsCount,
      total_price: Number(formData.totalPrice.toFixed(2)),
      has_voucher: !!appliedVoucher,
      price_on_request: priceOnRequest,
    });

    try {
      // Sanitizar dados antes de guardar
      const reservation = {
        propertyId: formData.propertyId,
        guestName: formData.guestName.trim(),
        guestEmail: formData.guestEmail.trim().toLowerCase(),
        guestPhone: formData.guestPhone.trim(),
        specialRequests: formData.specialRequests.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        guestsCount: Number(formData.guestsCount),
        totalPrice: Number(formData.totalPrice),
        priceOnRequest,
        status: 'pending',
        createdAt: new Date().toISOString(),
        ...(appliedVoucher && {
          voucher: {
            code: appliedVoucher.code,
            discount: discount,
            originalPrice: originalPrice
          }
        })
      };
      
      // Criar reserva + lock público de datas de forma atómica
      const reservationRef = doc(collection(db, 'reservations'));
      const reservationLockRef = doc(db, 'reservationLocks', reservationRef.id);
      const reservationBatch = writeBatch(db);

      reservationBatch.set(reservationRef, reservation);
      reservationBatch.set(reservationLockRef, {
        reservationId: reservationRef.id,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        status: reservation.status,
        createdAt: new Date().toISOString(),
      });

      await reservationBatch.commit();

      await logClientEvent({
        event: 'booking_submit_success',
        context: {
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          totalPrice: reservation.totalPrice,
          guestsCount: reservation.guestsCount,
          priceOnRequest: reservation.priceOnRequest,
        },
      });
      void trackAnalyticsEvent('booking_submit_success', {
        guests_count: reservation.guestsCount,
        total_price: Number(reservation.totalPrice.toFixed(2)),
        has_voucher: !!appliedVoucher,
        price_on_request: reservation.priceOnRequest,
      });
      
      // Enviar emails (confirmação para hóspede + notificação para admin)
      try {
        if (emailApiUrl) {
          // Email de confirmação para o hóspede
          await fetch(emailApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'reservation_confirmation',
              data: {
                guestName: reservation.guestName,
                guestEmail: reservation.guestEmail,
                startDate: reservation.startDate,
                endDate: reservation.endDate,
                nights: nights,
                guestsCount: reservation.guestsCount,
                totalPrice: reservation.totalPrice,
                priceOnRequest: reservation.priceOnRequest,
                discount: discount || 0,
                propertyName: 'Enzo Loft'
              }
            })
          });

          // Email de notificação para o admin
          await fetch(emailApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'admin_notification',
              data: {
                guestName: reservation.guestName,
                guestEmail: reservation.guestEmail,
                guestPhone: reservation.guestPhone,
                startDate: reservation.startDate,
                endDate: reservation.endDate,
                nights: nights,
                guestsCount: reservation.guestsCount,
                totalPrice: reservation.totalPrice,
                priceOnRequest: reservation.priceOnRequest
              }
            })
          });
        } else {
          await logClientEvent({
            event: 'booking_email_notifications_skipped',
            level: 'warning',
            context: { reason: 'NEXT_PUBLIC_EMAIL_API_URL_not_configured' },
          });
        }
      } catch (emailError) {
        console.error('Erro ao enviar emails:', emailError);
        await logClientError('booking_email_notifications_failed', emailError, {
          guestEmail: reservation.guestEmail,
        });
        // Não bloquear a reserva se o email falhar
      }
      
      setMessage('✅ Reserva criada com sucesso! Verifique o seu email para mais informações.');
      setFormData({ propertyId: '1', guestName: '', guestEmail: '', guestPhone: '', specialRequests: '', startDate: '', endDate: '', guestsCount: 1, totalPrice: 0 });
      setPhoneCountryCode('PT');
      setPhoneLocalNumber('');
      setAppliedVoucher(null);
      setVoucherCode('');
      setDiscount(0);
      setOriginalPrice(0);
      setPriceOnRequest(false);
      setVoucherError('');
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      await logClientError('booking_submit_failed', error);
      void trackAnalyticsEvent('booking_submit_failed');
      setMessage('❌ Erro ao criar reserva. Tente novamente.');
    } finally {
      setLoading(false);
      setSubmittingReservation(false);
    }
  }, [appliedVoucher, dateError, discount, emailApiUrl, formData, nights, originalPrice, priceOnRequest]);

  const handleContactSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    const recipientEmail = 'alentejo.enzoloft@gmail.com';
    const name = contactFormData.name.trim();
    const email = contactFormData.email.trim().toLowerCase();
    const phone = contactFormData.phone.trim();
    const messageText = contactFormData.message.trim();

    if (!name || name.length < 3) {
      setContactFormMessage('❌ Por favor, indique um nome válido.');
      return;
    }

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setContactFormMessage('❌ Por favor, indique um email válido.');
      return;
    }

    if (!messageText || messageText.length < 10) {
      setContactFormMessage('❌ Escreva uma mensagem com pelo menos 10 caracteres.');
      return;
    }

    setSubmittingContact(true);
    setContactFormMessage('');

    try {
      if (emailApiUrl) {
        const today = formatDateKey(new Date());
        const response = await fetch(emailApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'admin_notification',
            data: {
              toEmail: recipientEmail,
              guestName: `[Contacto] ${name}`,
              guestEmail: email,
              guestPhone: phone || 'N/A',
              startDate: today,
              endDate: today,
              nights: 0,
              guestsCount: 0,
              totalPrice: 0,
              contactMessage: messageText,
              propertyName: 'Enzo Loft',
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Falha ao enviar contacto: ${response.status}`);
        }
      } else {
        const subject = encodeURIComponent(`Novo contacto - ${name}`);
        const body = encodeURIComponent(
          `Nome: ${name}\nEmail: ${email}\nTelefone: ${phone || 'N/A'}\n\nMensagem:\n${messageText}`
        );
        window.location.href = `mailto:${recipientEmail}?subject=${subject}&body=${body}`;
      }

      await logClientEvent({ event: 'contact_form_submit_success' });
      setContactFormMessage('✅ Mensagem enviada com sucesso. Entraremos em contacto em breve.');
      setContactFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Erro ao enviar formulário de contacto:', error);
      await logClientError('contact_form_submit_failed', error);
      setContactFormMessage('❌ Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setSubmittingContact(false);
    }
  }, [contactFormData, emailApiUrl]);

  const amenities = useMemo(() => [
    { icon: '🛏️', label: '1 Quarto' },
    { icon: '🚿', label: '1 WC' },
    { icon: '👥', label: '4+1' },
    { icon: '📶', label: 'Wi-Fi Gratuito' },
    { icon: '❄️', label: 'Ar Condicionado' },
    { icon: '🍳', label: 'Cozinha Equipada' },
    { icon: '🧺', label: 'Máquina de Lavar e Secar Roupa' },
    { icon: '🍽️', label: 'Máquina de Lavar Loiça' },
    { icon: '🌤️', label: 'Espaço Exterior' },
    { icon: '🚗', label: 'Estacionamento' },
    { icon: '🔑', label: 'Check-in autónomo' },
    { icon: '📺', label: '3 TVs' },
    { icon: '🔥', label: 'Lareira' },
    { icon: '💦', label: 'Tanque Alentejano' },
    { icon: '☕', label: 'Máquina de café Nespresso' },
    { icon: '💇', label: 'Secador de cabelo' },
  ], []);

  const galleryImages = useMemo(() => [
    { src: '/images/IMG_0033.JPG', alt: 'EnzoLoft - Foto 1' },
    { src: '/images/IMG_0035.JPG', alt: 'EnzoLoft - Foto 2' },
    { src: '/images/IMG_0037.JPG', alt: 'EnzoLoft - Foto 3' },
    { src: '/images/IMG_0038.JPG', alt: 'EnzoLoft - Foto 4' },
    { src: '/images/IMG_0040(1).JPG', alt: 'EnzoLoft - Foto 5' },
    { src: '/images/IMG_0042(1).JPG', alt: 'EnzoLoft - Foto 6' },
    { src: '/images/IMG_0043.JPG', alt: 'EnzoLoft - Foto 7' },
    { src: '/images/IMG_0046.JPG', alt: 'EnzoLoft - Foto 8' },
    { src: '/images/IMG_0047.JPG', alt: 'EnzoLoft - Foto 9' },
    { src: '/images/IMG_0050.JPG', alt: 'EnzoLoft - Foto 10' },
    { src: '/images/IMG_0051.JPG', alt: 'EnzoLoft - Foto 11' },
    { src: '/images/IMG_0052.JPG', alt: 'EnzoLoft - Foto 12' },
    { src: '/images/IMG_0053.JPG', alt: 'EnzoLoft - Foto 13' },
    { src: '/images/IMG_0054.JPG', alt: 'EnzoLoft - Foto 14' },
    { src: '/images/IMG_0055.JPG', alt: 'EnzoLoft - Foto 15' },
  ], []);

  const selectedImage = selectedImageIndex !== null ? galleryImages[selectedImageIndex] : null;

  const goToNextImage = useCallback(() => {
    setSelectedImageIndex((currentIndex) => {
      if (currentIndex === null) return currentIndex;
      return (currentIndex + 1) % galleryImages.length;
    });
  }, [galleryImages.length]);

  const goToPreviousImage = useCallback(() => {
    setSelectedImageIndex((currentIndex) => {
      if (currentIndex === null) return currentIndex;
      return (currentIndex - 1 + galleryImages.length) % galleryImages.length;
    });
  }, [galleryImages.length]);

  useEffect(() => {
    if (selectedImageIndex === null) return;

    const handleLightboxKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        goToNextImage();
      } else if (event.key === 'ArrowLeft') {
        goToPreviousImage();
      } else if (event.key === 'Escape') {
        setSelectedImageIndex(null);
      }
    };

    window.addEventListener('keydown', handleLightboxKeyDown);
    return () => window.removeEventListener('keydown', handleLightboxKeyDown);
  }, [goToNextImage, goToPreviousImage, selectedImageIndex]);

  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'LodgingBusiness',
          '@id': `${canonicalUrl}#lodging`,
          name: 'EnzoLoft',
          url: canonicalUrl,
          description: siteDescription,
          email: contactInfo.email,
          telephone: contactInfo.phone,
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Vila Ruiva',
            addressRegion: 'Beja',
            addressCountry: 'PT',
          },
          image: [ogImageUrl],
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 37.9833,
            longitude: -7.9167,
          },
          amenityFeature: amenities.map((amenity) => ({
            '@type': 'LocationFeatureSpecification',
            name: amenity.label,
            value: true,
          })),
          sameAs: [canonicalUrl],
        },
        {
          '@type': 'WebSite',
          '@id': `${canonicalUrl}#website`,
          url: canonicalUrl,
          name: 'EnzoLoft',
          inLanguage: 'pt-PT',
          publisher: {
            '@id': `${canonicalUrl}#lodging`,
          },
        },
      ],
    }),
    [amenities, canonicalUrl, contactInfo.email, contactInfo.phone, ogImageUrl]
  );

  const canSubmitReservation = useMemo(() => {
    return (
      !!formData.guestName.trim() &&
      !!formData.guestEmail.trim() &&
      !!formData.guestPhone.trim() &&
      !!formData.startDate &&
      !!formData.endDate &&
      (formData.totalPrice > 0 || priceOnRequest) &&
      dateError === '' &&
      !loading &&
      !submittingReservation
    );
  }, [dateError, formData, loading, priceOnRequest, submittingReservation]);

  const seoHead = (
    <Head>
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content="alojamento alentejo, alojamento local alentejo, casa férias beja, vila ruiva, cuba alentejo, casa com piscina, turismo rural alentejo, férias alentejo, aluguer casa alentejo, alojamento cuba beja, casa rural piscina alentejo, fins de semana alentejo, enzoloft" />
      <meta name="geo.region" content="PT-BE" />
      <meta name="geo.placename" content="Vila Ruiva, Cuba, Beja, Alentejo" />
      <meta name="geo.position" content="37.9833;-7.9167" />
      <meta name="ICBM" content="37.9833, -7.9167" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="robots" content="index, follow, max-image-preview:large" />
      <meta name="author" content="EnzoLoft" />
      <meta property="og:title" content={siteTitle} />
      <meta property="og:description" content={siteDescription} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:site_name" content="EnzoLoft" />
      <meta property="og:locale" content="pt_PT" />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:image:secure_url" content={ogImageUrl} />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="EnzoLoft no Alentejo" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteTitle} />
      <meta name="twitter:description" content={siteDescription} />
      <meta name="twitter:image" content={ogImageUrl} />
      <meta name="twitter:image:alt" content="EnzoLoft no Alentejo" />
      <link rel="dns-prefetch" href="https://images.unsplash.com" />
      <link rel="preconnect" href="https://images.unsplash.com" />
      <link rel="dns-prefetch" href="https://enzoloft.web.app" />
      {googleSiteVerification && (
        <meta name="google-site-verification" content={googleSiteVerification} />
      )}
      {bingSiteVerification && (
        <meta name="msvalidate.01" content={bingSiteVerification} />
      )}
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="pt" href={canonicalUrl} />
      <link rel="alternate" hrefLang="pt-PT" href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href={canonicalUrl} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </Head>
  );

  if (!siteModeLoaded) {
    return (
      <>
        {seoHead}
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600"></div>
        </div>
      </>
    );
  }

  if (presentationModeEnabled) {
    return (
      <>
        {seoHead}
        <PresentationModePage
          amenities={amenities}
          galleryImages={galleryImages}
          contactInfo={contactInfo}
          includeHead={false}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {seoHead}
      
      {/* Header */}
      <header className="bg-white border-b-2 border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl sm:text-3xl"></span>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">EnzoLoft</h1>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAmenitiesModal(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 sm:px-6 py-2 rounded-full hover:shadow-lg hover:shadow-purple-300 transition-all font-semibold text-sm"
            >
              Comodidades
            </button>
            <a href="#booking" className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 sm:px-6 py-2 rounded-full hover:shadow-lg hover:shadow-orange-300 transition-all font-semibold text-sm">
              Reservar Agora
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="sm:hidden flex flex-col gap-1.5 p-2 hover:bg-orange-50 rounded-lg transition-colors"
            aria-label="Abrir menu"
          >
            <span className={`block w-6 h-0.5 bg-orange-600 transition-all ${showMobileMenu ? 'rotate-45 translate-y-2' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-orange-600 transition-all ${showMobileMenu ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-orange-600 transition-all ${showMobileMenu ? '-rotate-45 -translate-y-2' : ''}`}></span>
          </button>
        </div>
        
        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="sm:hidden border-t border-orange-100 bg-white">
            <div className="px-4 py-3 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowAmenitiesModal(true);
                  setShowMobileMenu(false);
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white px-4 py-3 rounded-full hover:shadow-lg hover:shadow-purple-300 transition-all font-semibold"
              >
                Comodidades
              </button>
              <a 
                href="#booking" 
                onClick={() => setShowMobileMenu(false)}
                className="block text-center bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 rounded-full hover:shadow-lg hover:shadow-orange-300 transition-all font-semibold"
              >
                Reservar Agora
              </a>
            </div>
          </div>
        )}
      </header>

      {showAmenitiesModal && (
        <div
          className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setShowAmenitiesModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl border-2 border-orange-100 shadow-2xl flex flex-col max-h-[90vh] animate-[fadeIn_.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-shrink-0 rounded-t-2xl">
              <h3 className="text-white text-xl sm:text-2xl font-bold truncate min-w-0">Comodidades da Casa</h3>
              <button
                type="button"
                aria-label="Fechar popup de comodidades"
                onClick={() => setShowAmenitiesModal(false)}
                className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 text-white text-xl font-bold hover:bg-white/30 transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-gradient-to-b from-orange-50 to-white overflow-y-auto">
              <p className="text-gray-700 mb-5">Tudo preparado para uma estadia confortável no Alentejo.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {amenities.map((amenity) => (
                  <div
                    key={amenity.label}
                    className="rounded-xl border border-orange-100 bg-white p-4 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all"
                  >
                    <div className="text-3xl mb-2" aria-hidden="true">{amenity.icon}</div>
                    <h4 className="font-bold text-orange-900">{amenity.label}</h4>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero Section with Booking Form */}
      <section id="booking" className="relative py-10 sm:py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <Image
            src="/images/exterior.jpg"
            alt="Exterior do EnzoLoft"
            fill
            priority
            quality={100}
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <div
          className="absolute inset-0 z-0 bg-gradient-to-r from-amber-900/25 via-amber-700/18 to-yellow-900/25"
          aria-hidden="true"
        />
        
        {/* Content */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center">
            {/* Hero Content - Left Side */}
            <div className="text-white">
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 drop-shadow-lg">{pageTexts.heroTitle}</h2>
              <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 drop-shadow-md">{pageTexts.heroSubtitle}</p>
            </div>

            {/* Booking Form - Right Side */}
            <div id="booking-form-card" className={`${showMobileBookingForm ? 'block' : 'hidden'} lg:block bg-white rounded-xl p-6 shadow-2xl`}>
              <div className="lg:hidden flex justify-end mb-2">
                <button
                  type="button"
                  onClick={() => setShowMobileBookingForm(false)}
                  className="text-xs font-semibold text-orange-700 hover:text-orange-900"
                >
                  Fechar formulário
                </button>
              </div>
              <h3 className="text-2xl font-bold text-orange-900 mb-4">Fazer Reserva</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-2">Nome Completo</label>
                  <input
                    type="text"
                    name="guestName"
                    required
                    autoComplete="name"
                    value={formData.guestName}
                    onChange={handleChange}
                    placeholder="Seu nome"
                    className="w-full px-3 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-2">Email</label>
                  <input
                    type="email"
                    name="guestEmail"
                    required
                    autoComplete="email"
                    value={formData.guestEmail}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-2">Telefone</label>
                  <div className="flex gap-1.5">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => {
                        const country = COUNTRIES.find(c => c.code === e.target.value)!;
                        setPhoneCountryCode(e.target.value);
                        setFormData(prev => ({ ...prev, guestPhone: country.dialCode + phoneLocalNumber }));
                      }}
                      className="w-28 px-2 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                      aria-label="Indicativo do país"
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.code} value={c.code}>{c.flag} {c.dialCode}</option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      name="guestPhone"
                      required
                      autoComplete="tel-national"
                      inputMode="tel"
                      value={phoneLocalNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^\d\s\-()]/g, '');
                        const country = COUNTRIES.find(c => c.code === phoneCountryCode)!;
                        setPhoneLocalNumber(val);
                        setFormData(prev => ({ ...prev, guestPhone: country.dialCode + val }));
                      }}
                      placeholder="912 345 678"
                      className="flex-1 px-3 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-2">Pedidos Especiais (opcional)</label>
                  <textarea
                    name="specialRequests"
                    value={formData.specialRequests}
                    onChange={handleChange}
                    placeholder="Ex.: berço, hora de chegada aproximada, preferências..."
                    maxLength={500}
                    rows={4}
                    className="w-full px-3 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm resize-y"
                  />
                  <p className="text-[11px] text-gray-500 mt-1 text-right">
                    {formData.specialRequests.length}/500
                  </p>
                </div>
                <div>
                    {dateError && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2 text-xs text-red-700 font-semibold mb-2">
                        {dateError}
                      </div>
                    )}
                  <label className="block text-xs font-semibold text-orange-900 mb-1">Selecione as datas</label>
                  <p className="text-[11px] text-gray-600 mb-1.5">{dateSelectionStepLabel}</p>
                  <button
                    type="button"
                    onClick={() => setShowFormCalendar(!showFormCalendar)}
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg bg-gradient-to-br from-white to-orange-50 text-left text-sm font-medium text-gray-700 hover:border-orange-300 transition"
                  >
                    {formData.startDate && formData.endDate 
                      ? `${new Date(formData.startDate).toLocaleDateString('pt-PT')} - ${new Date(formData.endDate).toLocaleDateString('pt-PT')}`
                      : formData.startDate
                      ? `Check-in: ${new Date(formData.startDate).toLocaleDateString('pt-PT')}`
                      : '📅 Clique para selecionar datas'}
                  </button>
                  {liveNights > 0 && (
                    <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                      🌙 {liveNights} {liveNights === 1 ? 'noite' : 'noites'}
                    </div>
                  )}
                  
                  {showFormCalendar && (
                    <div className="mt-2 border border-orange-300 rounded p-2 sm:p-3 bg-white shadow-lg max-h-96 overflow-auto">
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-2">
                        <div>
                          <label className="block text-xs font-semibold text-orange-900 mb-1">Check-in</label>
                          <input
                            type="date"
                            name="startDate"
                            min={formatDateKey(new Date())}
                            value={formData.startDate}
                            onChange={handleChange}
                            className="w-full px-2 py-2 sm:py-2.5 border border-orange-200 rounded text-xs sm:text-sm focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-orange-900 mb-1">Check-out</label>
                          <input
                            type="date"
                            name="endDate"
                            min={formData.startDate || formatDateKey(new Date())}
                            value={formData.endDate}
                            onChange={handleChange}
                            className="w-full px-2 py-2 sm:py-2.5 border border-orange-200 rounded text-xs sm:text-sm focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="flex justify-between items-center mb-2 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newMonth = new Date(formCalendarMonth);
                            newMonth.setMonth(newMonth.getMonth() - 1);
                            setFormCalendarMonth(newMonth);
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-semibold min-w-8"
                        >
                          ◀
                        </button>
                        <h4 className="text-xs sm:text-sm font-bold text-orange-900 flex-1 text-center">
                          {formCalendarMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const newMonth = new Date(formCalendarMonth);
                            newMonth.setMonth(newMonth.getMonth() + 1);
                            setFormCalendarMonth(newMonth);
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-semibold min-w-8"
                        >
                          ▶
                        </button>
                      </div>
                      
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                          <div key={i} className="text-center font-bold text-orange-900 text-[10px] sm:text-xs py-1">
                            {day}
                          </div>
                        ))}
                        
                        {(() => {
                          const year = formCalendarMonth.getFullYear();
                          const month = formCalendarMonth.getMonth();
                          const firstDay = new Date(year, month, 1).getDay();
                          const daysInMonth = new Date(year, month + 1, 0).getDate();
                          const days = [];
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          
                          // Empty cells
                          for (let i = 0; i < firstDay; i++) {
                            days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
                          }
                          
                          // Days
                          for (let day = 1; day <= daysInMonth; day++) {
                            const date = new Date(year, month, day);
                            const dateStr = formatDateKey(date);
                            const nightlyPrice = getNightlyPrice(dateStr);
                            
                            const isBlocked = isDateBlocked(dateStr);
                            const isReserved = isDateReserved(dateStr);
                            
                            const isPast = date < today;
                            const isSelected = dateStr === formData.startDate || dateStr === formData.endDate;
                            const isInRange = formData.startDate && formData.endDate && dateStr > formData.startDate && dateStr < formData.endDate;
                            
                            const awaitingCheckout = !!formData.startDate && !formData.endDate;
                            const isInvalidCheckoutCandidate = awaitingCheckout && dateStr <= formData.startDate;

                            let bgColor = 'bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer';
                            let disabled = false;
                            
                            if (isPast) {
                              bgColor = 'bg-gray-100 text-gray-400 cursor-not-allowed';
                              disabled = true;
                            } else if (isInvalidCheckoutCandidate) {
                              bgColor = 'bg-gray-100 text-gray-400 cursor-not-allowed';
                              disabled = true;
                            } else if (isBlocked) {
                              bgColor = 'bg-red-200 border-red-400 cursor-not-allowed';
                              disabled = true;
                            } else if (isReserved) {
                              bgColor = 'bg-orange-200 border-orange-400 cursor-not-allowed';
                              disabled = true;
                            }
                            
                            if (isSelected) {
                              bgColor = bgColor + ' ring-2 ring-blue-500 font-bold';
                            } else if (isInRange) {
                              bgColor = 'bg-blue-50 border-blue-200';
                            }
                            
                            days.push(
                              <button
                                key={day}
                                type="button"
                                disabled={disabled}
                                onClick={() => {
                                  if (!formData.startDate || (formData.startDate && formData.endDate)) {
                                    handleDateSelect(dateStr, 'start');
                                  } else {
                                    handleDateSelect(dateStr, 'end');
                                  }
                                }}
                                className={`h-11 sm:h-12 border rounded p-0.5 text-center font-semibold transition-all hover:scale-105 ${bgColor}`}
                              >
                                <div className="flex h-full flex-col items-center justify-center leading-none">
                                  <span className="text-[10px] sm:text-xs">{day}</span>
                                  {!disabled && nightlyPrice !== null && (
                                    <span className="mt-0.5 text-[8px] sm:text-[9px] font-normal">€{nightlyPrice}</span>
                                  )}
                                </div>
                              </button>
                            );
                          }
                          
                          return days;
                        })()}
                      </div>
                      
                      {/* Mini Legend */}
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-2 text-[9px] sm:text-xs justify-center">
                        <div className="flex items-center gap-0.5">
                          <div className="w-2 h-2 bg-green-100 border border-green-300 rounded"></div>
                          <span>Disponível</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <div className="w-2 h-2 bg-orange-200 border border-orange-400 rounded"></div>
                          <span>Reservado</span>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <div className="w-2 h-2 bg-red-200 border border-red-400 rounded"></div>
                          <span>Bloqueado</span>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 sm:gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, startDate: '', endDate: '', totalPrice: 0 }));
                            setDateError('');
                            setShowFormCalendar(false);
                          }}
                          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 sm:py-2.5 rounded text-xs sm:text-sm font-semibold"
                        >
                          Limpar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFormCalendar(false)}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 sm:py-2.5 rounded text-xs sm:text-sm font-semibold"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-2">Número de Hóspedes</label>
                  <select
                    name="guestsCount"
                    value={formData.guestsCount}
                    onChange={handleChange}
                    className="w-full px-3 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                  >
                    <option value="1">1 hóspede</option>
                    <option value="2">2 hóspedes</option>
                    <option value="3">3 hóspedes</option>
                    <option value="4">4 hóspedes</option>
                    <option value="5">5 hóspedes</option>
                  </select>
                </div>
                
                {/* Voucher Section */}
                <div className="border-t pt-3">
                  <label className="block text-xs font-semibold text-orange-900 mb-1">Código de Voucher (opcional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      className="flex-1 px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm uppercase"
                    />
                    <button
                      type="button"
                      onClick={applyVoucher}
                      disabled={formData.totalPrice === 0 || priceOnRequest}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aplicar
                    </button>
                  </div>
                  {formData.totalPrice === 0 && voucherCode && !priceOnRequest && (
                    <p className="text-xs text-gray-600 mt-1">💡 Selecione as datas primeiro para aplicar o voucher</p>
                  )}
                  {priceOnRequest && (
                    <p className="text-xs text-gray-600 mt-1">💡 Para este período, o valor é sob consulta e não permite voucher.</p>
                  )}
                  {voucherError && (
                    <p className="text-xs text-red-600 mt-1">❌ {voucherError}</p>
                  )}
                  {appliedVoucher && (
                    <div className="mt-2 flex items-center justify-between bg-purple-50 border border-purple-200 p-2 rounded-lg">
                      <p className="text-xs text-purple-800 font-semibold">
                        🎁 {appliedVoucher.code}: {appliedVoucher.type === 'percentage' ? `${appliedVoucher.value}%` : `€${appliedVoucher.value}`} desconto
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedVoucher(null);
                          setVoucherCode('');
                          setDiscount(0);
                          setVoucherError('');
                          setFormData(prev => ({ ...prev, totalPrice: originalPrice }));
                          setMessage('');
                        }}
                        className="text-purple-600 hover:text-purple-800 text-xs font-semibold"
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
                
                {(formData.totalPrice > 0 || priceOnRequest) && (
                  <div className="bg-green-50 border-2 border-green-300 p-3 rounded-lg">
                    <p className="text-xs text-green-700 font-semibold mb-2">Resumo do Preço</p>
                    {liveNights > 0 && (
                      <p className="text-xs text-gray-700 mb-2">{liveNights} {liveNights === 1 ? 'noite' : 'noites'} selecionadas</p>
                    )}
                    {appliedVoucher && !priceOnRequest ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-gray-700">
                          <span>Preço Original:</span>
                          <span>€{originalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-purple-700 font-semibold">
                          <span>Desconto ({appliedVoucher.code}):</span>
                          <span>-€{discount.toFixed(2)}</span>
                        </div>
                        <div className="border-t border-green-300 pt-1 mt-1"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-green-800">Total Final:</span>
                          <span className="text-2xl font-bold text-green-800">€{formData.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    ) : priceOnRequest ? (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-green-800">Total:</span>
                          <span className="text-2xl font-bold text-green-800">Sob consulta</span>
                        </div>
                        <p className="text-xs text-gray-700">Sem preço definido para uma ou mais noites deste período.</p>
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-green-800">€{formData.totalPrice.toFixed(2)}</p>
                    )}
                  </div>
                )}
                
                {message && (
                  <div className={`border-2 p-3 rounded-lg font-semibold text-xs ${
                    message.includes('✅') ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
                  }`}>
                    {message}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={!canSubmitReservation}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 sm:py-4 px-4 rounded-lg hover:shadow-lg hover:shadow-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 text-base sm:text-lg"
                >
                  {loading ? '⏳ Processando...' : '🎯 Reservar Agora'}
                </button>
                {!canSubmitReservation && bookingStarted && (
                  <p className="text-xs text-gray-600 text-center">
                    Preencha todos os campos e selecione datas válidas para concluir a reserva.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => {
          setShowMobileBookingForm(true);
          setTimeout(() => {
            document.getElementById('booking-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 50);
        }}
        className="lg:hidden fixed bottom-4 right-4 z-[65] bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold px-5 py-3 rounded-full shadow-xl hover:shadow-orange-300 transition-all"
      >
        Reservar Agora
      </button>

      {/* About Section */}
      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-10 sm:py-16" style={deferredSectionStyle}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 flex flex-col gap-10 sm:gap-14">
          {/* Bloco 1: texto esquerda, foto Exterior direita */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-orange-900 mb-4 sm:mb-6">{pageTexts.aboutTitle}</h2>
              <p className="text-gray-700 text-base sm:text-lg leading-relaxed">
                {renderFormattedText(pageTexts.aboutParagraph1)}
              </p>
            </div>
            <div className="relative w-full h-64 sm:h-80 rounded-xl shadow-xl overflow-hidden">
              <Image
                src="/images/sobre-exterior.jpg"
                alt="Exterior do EnzoLoft"
                fill
                quality={95}
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
                decoding="async"
                className="object-cover"
              />
            </div>
          </div>
          {/* Bloco 2: foto Piscina esquerda, texto direita (só se tiver conteúdo) */}
          {(pageTexts.aboutTitle2 || pageTexts.aboutParagraph2) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
              <div className="relative w-full h-64 sm:h-80 rounded-xl shadow-xl overflow-hidden order-2 md:order-1">
                <Image
                  src="/images/piscina.jpg"
                  alt="Tanque Alentejano"
                  fill
                  quality={70}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  loading="lazy"
                  decoding="async"
                  className="object-cover"
                />
              </div>
              <div className="order-1 md:order-2">
                {pageTexts.aboutTitle2 && (
                  <h3 className="text-2xl sm:text-3xl font-bold text-orange-900 mb-4 sm:mb-6">{pageTexts.aboutTitle2}</h3>
                )}
                {pageTexts.aboutParagraph2 && (
                  <p className="text-gray-700 text-base sm:text-lg leading-relaxed">{renderFormattedText(pageTexts.aboutParagraph2)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Amenities */}
      <section className="bg-white py-10 sm:py-16" style={deferredSectionStyle}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <h2 className="text-3xl sm:text-4xl font-bold text-orange-900 mb-8 sm:mb-12 text-center">Comodidades</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-6">
            {amenities.map((amenity, idx) => (
              <div key={idx} className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl text-center hover:shadow-lg transition-all duration-300 border-2 border-orange-100">
                <div className="text-5xl mb-4">{amenity.icon}</div>
                <h3 className="text-lg font-semibold text-orange-900">{amenity.label}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-16" style={deferredSectionStyle}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-orange-900 mb-12 text-center">Galeria</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {galleryImages.map((image, idx) => (
              <div 
                key={idx} 
                className="relative h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 cursor-pointer"
                onClick={() => setSelectedImageIndex(idx)}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  quality={60}
                  sizes="(max-width: 768px) 100vw, 25vw"
                  loading="lazy"
                  decoding="async"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-black opacity-0 hover:opacity-20 transition-opacity duration-300 flex items-center justify-center">
                  <span className="text-white text-4xl opacity-0 hover:opacity-100 transition-opacity">🔍</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Image Modal/Lightbox */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImageIndex(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setSelectedImageIndex(null)}
              className="absolute -top-12 right-0 text-white text-4xl hover:text-orange-500 transition-colors"
              aria-label="Fechar"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToPreviousImage();
              }}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/45 text-white text-2xl hover:bg-black/65 transition-colors"
              aria-label="Foto anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToNextImage();
              }}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/45 text-white text-2xl hover:bg-black/65 transition-colors"
              aria-label="Foto seguinte"
            >
              ›
            </button>
            <Image
              src={selectedImage.src}
              alt={selectedImage.alt}
              width={1600}
              height={900}
              quality={85}
              sizes="100vw"
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-4 text-xl">{selectedImage.alt}</p>
          </div>
        </div>
      )}

      {!hideContactForm && (
      <section className="py-10 sm:py-14 bg-gradient-to-b from-white to-orange-50" style={deferredSectionStyle}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <div className="bg-white border-2 border-orange-100 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-orange-900 mb-2">Fale Connosco</h2>
            <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
              Tem alguma questão sobre disponibilidade, preços ou condições da casa? Envie-nos uma mensagem.
            </p>

            <form onSubmit={handleContactSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-orange-900 mb-1 sm:mb-2">Nome</label>
                  <input
                    type="text"
                    value={contactFormData.name}
                    onChange={(e) => setContactFormData((currentData) => ({ ...currentData, name: e.target.value }))}
                    placeholder="O seu nome"
                    required
                    className="w-full px-3 py-2 sm:py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-orange-900 mb-1 sm:mb-2">Email</label>
                  <input
                    type="email"
                    value={contactFormData.email}
                    onChange={(e) => setContactFormData((currentData) => ({ ...currentData, email: e.target.value }))}
                    placeholder="seu@email.com"
                    required
                    className="w-full px-3 py-2 sm:py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-orange-900 mb-1 sm:mb-2">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData((currentData) => ({ ...currentData, phone: e.target.value }))}
                  placeholder="+351 ..."
                  className="w-full px-3 py-2 sm:py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-orange-900 mb-1 sm:mb-2">Mensagem</label>
                <textarea
                  value={contactFormData.message}
                  onChange={(e) => setContactFormData((currentData) => ({ ...currentData, message: e.target.value }))}
                  placeholder="Escreva aqui a sua mensagem"
                  required
                  rows={5}
                  className="w-full px-3 py-2 sm:py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={submittingContact}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 sm:py-4 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {submittingContact ? '⏳ A enviar...' : 'Enviar Mensagem'}
              </button>

              {contactFormMessage && (
                <p className="text-xs sm:text-sm font-semibold text-gray-700">{contactFormMessage}</p>
              )}

              <p className="text-[10px] sm:text-xs text-gray-500">
                Destinatário: alentejo.enzoloft@gmail.com
              </p>
            </form>
          </div>
        </div>
      </section>
      )}

      {/* Footer */}
      <footer className="bg-gradient-to-r from-orange-900 to-red-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4">
          <div className="text-center mb-6 sm:mb-8">
            <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">EnzoLoft</h3>
            <p className="mb-3 sm:mb-4 text-sm sm:text-base">{contactInfo.description}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-8 mb-4 text-xs sm:text-sm">
              <span>📍 {contactInfo.location}</span>
              <span>📧 {contactInfo.email}</span>
              <span>📞 {contactInfo.phone}</span>
            </div>
            <div className="flex justify-center items-center gap-4 mb-4 sm:mb-6">
              <a
                href="https://www.instagram.com/alentejo.enzoloft?utm_source=qr&igsh=MWFlMDMwdTZrN3Q4Mw=="
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram EnzoLoft"
                className="hover:opacity-80 transition-opacity"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-7 h-7">
                  <defs>
                    <radialGradient id="ig-grad-footer" cx="30%" cy="107%" r="150%">
                      <stop offset="0%" stopColor="#fdf497"/>
                      <stop offset="5%" stopColor="#fdf497"/>
                      <stop offset="45%" stopColor="#fd5949"/>
                      <stop offset="60%" stopColor="#d6249f"/>
                      <stop offset="90%" stopColor="#285AEB"/>
                    </radialGradient>
                  </defs>
                  <path fill="url(#ig-grad-footer)" d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.333-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.333-2.633 1.308-3.608.975-.975 2.242-1.246 3.608-1.308C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.775.131 4.602.44 3.635 1.407 2.668 2.374 2.359 3.547 2.3 4.825 2.242 6.105 2.228 6.513 2.228 12s.014 5.895.072 7.175c.059 1.278.368 2.451 1.335 3.418.967.967 2.14 1.276 3.418 1.335C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.072c1.278-.059 2.451-.368 3.418-1.335.967-.967 1.276-2.14 1.335-3.418.058-1.28.072-1.688.072-7.175s-.014-5.895-.072-7.175c-.059-1.278-.368-2.451-1.335-3.418C19.398.44 18.225.131 16.947.072 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324A6.162 6.162 0 0 0 12 5.838zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
              </a>
              <a
                href="https://www.facebook.com/share/14cYTeWTuBM/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook EnzoLoft"
                className="text-blue-300 hover:text-blue-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.269h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
                </svg>
              </a>
              <a
                href="https://wa.me/351911704715"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp EnzoLoft"
                className="text-green-400 hover:text-green-300 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
          
          {/* Google Maps */}
          {contactInfo.mapsUrl && 
           contactInfo.mapsUrl.trim() !== '' && 
           (contactInfo.mapsUrl.includes('google.com/maps/embed') || contactInfo.mapsUrl.includes('maps.google.com')) && (
            <div className="mb-6 sm:mb-8">
              <div className="max-w-4xl mx-auto">
                <iframe
                  src={contactInfo.mapsUrl}
                  width="100%"
                  height="300"
                  style={{ border: 0, borderRadius: '12px' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="shadow-xl"
                  title="Google Maps Location"
                ></iframe>
              </div>
            </div>
          )}
          
          <p className="text-orange-200 text-xs sm:text-sm text-center">© 2026 EnzoLoft. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
