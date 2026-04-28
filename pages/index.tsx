import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { db, trackAnalyticsEvent } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
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
  startDate: string;
  endDate: string;
  guestsCount: number;
  totalPrice: number;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  message: string;
}

interface SiteMode {
  presentationModeEnabled?: boolean;
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
  const siteDescription = 'Retiro de charme no coração do Alentejo. Reserve agora o seu alojamento exclusivo em Vila Ruiva, Cuba - Beja. Casa completa com piscina, jardim e vistas deslumbrantes.';
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
    startDate: '',
    endDate: '',
    guestsCount: 1,
    totalPrice: 0,
  });
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [reservedDates, setReservedDates] = useState<{startDate: string, endDate: string}[]>([]);
  const [dateError, setDateError] = useState<string>('');
  const [nights, setNights] = useState<number>(0);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [showFormCalendar, setShowFormCalendar] = useState<boolean>(false);
  const [formCalendarMonth, setFormCalendarMonth] = useState<Date>(new Date());
  const [showAmenitiesModal, setShowAmenitiesModal] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null);
  const [presentationModeEnabled, setPresentationModeEnabled] = useState<boolean>(false);
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
  const bookingStartedRef = useRef(false);
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
        const [availabilitySnapshot, reservationsSnapshot, contactDoc, siteModeDoc] = await Promise.all([
          getDocs(collection(db, 'availability')),
          getDocs(query(collection(db, 'reservations'), where('status', '==', 'confirmed'))),
          getDoc(doc(db, 'settings', 'contactInfo')),
          getDoc(doc(db, 'settings', 'siteMode'))
        ]);
        
        // Datas bloqueadas
        const blockedData = availabilitySnapshot.docs.map(doc => doc.data() as BlockedDate);
        setBlockedDates(blockedData);
        
        // Reservas confirmadas
        const confirmedReservations = reservationsSnapshot.docs
          .map(doc => doc.data())
          .map(res => ({
            startDate: res.startDate,
            endDate: res.endDate
          }));
        setReservedDates(confirmedReservations);
        
        // Informações de contacto
        if (contactDoc.exists()) {
          setContactInfo(contactDoc.data() as any);
        }

        if (siteModeDoc.exists()) {
          const siteModeData = siteModeDoc.data() as SiteMode;
          setPresentationModeEnabled(Boolean(siteModeData.presentationModeEnabled));
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
    const checkDate = new Date(date);
    return blockedDates.some(block => {
      const blockStart = new Date(block.startDate);
      const blockEnd = new Date(block.endDate);
      return checkDate >= blockStart && checkDate <= blockEnd && block.status === 'blocked';
    });
  }, [blockedDates]);

  const isDateReserved = useCallback((date: string): boolean => {
    const checkDate = new Date(date);
    return reservedDates.some(res => {
      const resStart = new Date(res.startDate);
      const resEnd = new Date(res.endDate);
      return checkDate >= resStart && checkDate <= resEnd;
    });
  }, [reservedDates]);

  const checkDateRangeConflict = useCallback((start: string, end: string): { hasConflict: boolean; message: string } => {
    if (!start || !end) return { hasConflict: false, message: '' };
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (endDate <= startDate) {
      return { hasConflict: true, message: '❌ A data de check-out deve ser posterior à data de check-in.' };
    }
    
    let currentDate = new Date(startDate);
    
    while (currentDate < endDate) {
      const dateStr = formatDateKey(currentDate);
      
      if (isDateBlocked(dateStr)) {
        return { hasConflict: true, message: '❌ Uma ou mais datas selecionadas estão bloqueadas pelo administrador.' };
      }
      
      if (isDateReserved(dateStr)) {
        return { hasConflict: true, message: '❌ Uma ou mais datas selecionadas já estão reservadas. Escolha outras datas.' };
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return { hasConflict: false, message: '' };
  }, [isDateBlocked, isDateReserved]);
  const applyVoucher = useCallback(async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Por favor, insira um código de voucher.');
      void trackAnalyticsEvent('voucher_apply_failed', { reason: 'empty_code' });
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
  }, [voucherCode, originalPrice, formData.totalPrice]);
  const calculateTotalPrice = useCallback(async (startDate: string, endDate: string): Promise<number> => {
    if (!startDate || !endDate) return 0;

    const nightsCount = getNightsBetween(startDate, endDate);
    if (nightsCount <= 0) return 0;

    const start = new Date(`${startDate}T00:00:00`);
    setNights(nightsCount);
    
    try {
      // Carregar preços do Firestore
      const pricesSnapshot = await getDocs(collection(db, 'prices'));
      const prices: Price[] = pricesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Price));
      
      console.log('Preços carregados do Firestore:', prices);
      
      if (prices.length === 0) {
        console.log('Usando preço padrão: €100/noite');
        return nightsCount * 100;
      }
      
      let totalPrice = 0;
      
      // Calcular preço para cada noite
      let currentDate = new Date(start);
      for (let i = 0; i < nightsCount; i++) {
        const dateStr = formatDateKey(currentDate);
        
        // Encontrar preço aplicável para esta data
        const applicablePrice = prices.find((p: Price) => {
          const priceStart = new Date(p.startDate + 'T00:00:00');
          const priceEnd = new Date(p.endDate + 'T00:00:00');
          const checkDate = new Date(dateStr + 'T00:00:00');
          return checkDate >= priceStart && checkDate <= priceEnd;
        });
        
        if (applicablePrice) {
          console.log(`Data ${dateStr}: €${applicablePrice.pricePerNight} (${applicablePrice.season})`);
          totalPrice += parseFloat(applicablePrice.pricePerNight.toString());
        } else {
          console.log(`Data ${dateStr}: €100 (preço padrão)`);
          totalPrice += 100;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log('Total calculado:', totalPrice);
      setOriginalPrice(totalPrice);
      
      // Recalcular com desconto se houver voucher aplicado
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
        return totalPrice - discountAmount;
      }
      
      return totalPrice;
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      await logClientError('booking_price_calculation_failed', error, { startDate, endDate });
      return nightsCount * 100;
    }
  }, [appliedVoucher]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      return;
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
      } else {
        const calculatedPrice = await calculateTotalPrice(nextStartDate, nextEndDate);
        setFormData(prev => ({ ...prev, totalPrice: calculatedPrice }));
      }
    } else {
      setNights(0);
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
      } else {
        const calculatedPrice = await calculateTotalPrice(newFormData.startDate, newFormData.endDate);
        setFormData(prev => ({ ...prev, totalPrice: calculatedPrice }));
        setShowFormCalendar(false);
        await logClientEvent({
          event: 'booking_dates_selected',
          context: {
            startDate: newFormData.startDate,
            endDate: newFormData.endDate,
            totalPrice: calculatedPrice,
          },
        });
        void trackAnalyticsEvent('booking_dates_selected', {
          total_price: Number(calculatedPrice.toFixed(2)),
        });
      }
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

    if (formData.guestsCount < 1 || formData.guestsCount > 20) {
      void trackAnalyticsEvent('booking_submit_blocked', { reason: 'invalid_guests_count' });
      setMessage('❌ Número de hóspedes inválido (1-20).');
      setLoading(false);
      setSubmittingReservation(false);
      return;
    }

    void trackAnalyticsEvent('booking_submit_attempt', {
      guests_count: formData.guestsCount,
      total_price: Number(formData.totalPrice.toFixed(2)),
      has_voucher: !!appliedVoucher,
    });

    try {
      // Sanitizar dados antes de guardar
      const reservation = {
        propertyId: formData.propertyId,
        guestName: formData.guestName.trim(),
        guestEmail: formData.guestEmail.trim().toLowerCase(),
        guestPhone: formData.guestPhone.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        guestsCount: Number(formData.guestsCount),
        totalPrice: Number(formData.totalPrice),
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
      
      // Criar reserva no Firestore
      await addDoc(collection(db, 'reservations'), reservation);
      await logClientEvent({
        event: 'booking_submit_success',
        context: {
          startDate: reservation.startDate,
          endDate: reservation.endDate,
          totalPrice: reservation.totalPrice,
          guestsCount: reservation.guestsCount,
        },
      });
      void trackAnalyticsEvent('booking_submit_success', {
        guests_count: reservation.guestsCount,
        total_price: Number(reservation.totalPrice.toFixed(2)),
        has_voucher: !!appliedVoucher,
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
                totalPrice: reservation.totalPrice
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
      setFormData({ propertyId: '1', guestName: '', guestEmail: '', guestPhone: '', startDate: '', endDate: '', guestsCount: 1, totalPrice: 0 });
      setAppliedVoucher(null);
      setVoucherCode('');
      setDiscount(0);
      setOriginalPrice(0);
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
  }, [appliedVoucher, dateError, discount, emailApiUrl, formData, nights, originalPrice]);

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
    { icon: '📶', label: 'Wi-Fi Gratuito' },
    { icon: '❄️', label: 'Ar Condicionado' },
    { icon: '🍳', label: 'Cozinha Equipada' },
    { icon: '🧺', label: 'Máquina de Lavar e Secar Roupa' },
    { icon: '🍽️', label: 'Máquina de Lavar Loiça' },
    { icon: '🌤️', label: 'Espaço Exterior' },
    { icon: '🚗', label: 'Estacionamento Gratuito' },
    { icon: '🔑', label: 'Check-in autónomo' },
    { icon: '📺', label: '3 TVs' },
    { icon: '🔥', label: 'Lareira' },
    { icon: '🏊', label: 'Piscina' },
    { icon: '🌿', label: 'Jardim' },
  ], []);

  const galleryImages = useMemo(() => [
    { src: 'https://enzoloft.web.app/images/gallery/exterior.jpg', alt: 'Exterior' },
    { src: 'https://enzoloft.web.app/images/gallery/patio.jpg', alt: 'Pátio' },
    { src: 'https://enzoloft.web.app/images/gallery/sala.jpg', alt: 'Sala' },
    { src: 'https://enzoloft.web.app/images/gallery/cozinha.jpg', alt: 'Cozinha' },
    { src: 'https://enzoloft.web.app/images/gallery/quarto.jpg', alt: 'Quarto' },
    { src: 'https://enzoloft.web.app/images/gallery/casa-banho.jpg', alt: 'Casa de banho' },
    { src: 'https://enzoloft.web.app/images/gallery/vista.jpg', alt: 'Vista' },
    { src: 'https://enzoloft.web.app/images/gallery/piscina.jpg', alt: 'Piscina' },
  ], []);

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
          amenityFeature: amenities.map((amenity) => ({
            '@type': 'LocationFeatureSpecification',
            name: amenity,
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
      formData.totalPrice > 0 &&
      dateError === '' &&
      !loading &&
      !submittingReservation
    );
  }, [dateError, formData, loading, submittingReservation]);

  const seoHead = (
    <Head>
      <title>{siteTitle}</title>
      <meta name="description" content={siteDescription} />
      <meta name="keywords" content="alojamento alentejo, casa férias beja, vila ruiva, cuba alentejo, casa com piscina, turismo rural" />
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
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl"></span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">EnzoLoft</h1>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowAmenitiesModal(true)}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg hover:shadow-purple-300 transition-all font-semibold"
            >
              Comodidades
            </button>
            <a href="#booking" className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full hover:shadow-lg hover:shadow-orange-300 transition-all font-semibold">
              Reservar Agora
            </a>
          </div>
        </div>
      </header>

      {showAmenitiesModal && (
        <div
          className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setShowAmenitiesModal(false)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl border-2 border-orange-100 shadow-2xl overflow-hidden animate-[fadeIn_.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 flex items-center justify-between">
              <h3 className="text-white text-2xl font-bold">Comodidades da Casa</h3>
              <button
                type="button"
                aria-label="Fechar popup de comodidades"
                onClick={() => setShowAmenitiesModal(false)}
                className="w-9 h-9 rounded-full bg-white/20 text-white text-xl font-bold hover:bg-white/30 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 bg-gradient-to-b from-orange-50 to-white">
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
      <section id="booking" className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(234, 88, 12, 0.6), rgba(239, 68, 68, 0.55), rgba(234, 88, 12, 0.6)), url('https://enzoloft.web.app/images/gallery/exterior.jpg')",
            backgroundColor: '#c2410c',
          }}
          aria-hidden="true"
        />
        
        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Hero Content - Left Side */}
            <div className="text-white">
              <h2 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">Retiro Perfeito no Alentejo</h2>
              <p className="text-xl md:text-2xl mb-8 drop-shadow-md">Alojamento de charme em Vila Ruiva, Cuba - Beja</p>
              <div className="flex gap-4 text-lg flex-wrap">
                <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">📶 Wi-Fi Gratuito</span>
                <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">🏊 Piscina</span>
                <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">🌿 Jardim</span>
              </div>
            </div>

            {/* Booking Form - Right Side */}
            <div className="bg-white rounded-xl p-6 shadow-2xl">
              <h3 className="text-2xl font-bold text-orange-900 mb-4">Fazer Reserva</h3>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    name="guestName"
                    required
                    autoComplete="name"
                    value={formData.guestName}
                    onChange={handleChange}
                    placeholder="Seu nome"
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1">Email</label>
                  <input
                    type="email"
                    name="guestEmail"
                    required
                    autoComplete="email"
                    value={formData.guestEmail}
                    onChange={handleChange}
                    placeholder="seu@email.com"
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1">Telefone</label>
                  <input
                    type="tel"
                    name="guestPhone"
                    required
                    autoComplete="tel"
                    inputMode="tel"
                    value={formData.guestPhone}
                    onChange={handleChange}
                    placeholder="+351 ..."
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                  />
                </div>
                <div>
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
                    <div className="mt-1.5 border border-orange-300 rounded p-1.5 bg-white shadow-lg">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-[10px] font-semibold text-orange-900 mb-1">Check-in</label>
                          <input
                            type="date"
                            name="startDate"
                            min={formatDateKey(new Date())}
                            value={formData.startDate}
                            onChange={handleChange}
                            className="w-full px-2 py-1.5 border border-orange-200 rounded text-xs focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-orange-900 mb-1">Check-out</label>
                          <input
                            type="date"
                            name="endDate"
                            min={formData.startDate || formatDateKey(new Date())}
                            value={formData.endDate}
                            onChange={handleChange}
                            className="w-full px-2 py-1.5 border border-orange-200 rounded text-xs focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      {/* Navigation */}
                      <div className="flex justify-between items-center mb-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newMonth = new Date(formCalendarMonth);
                            newMonth.setMonth(newMonth.getMonth() - 1);
                            setFormCalendarMonth(newMonth);
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        >
                          ◀
                        </button>
                        <h4 className="text-xs font-bold text-orange-900">
                          {formCalendarMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const newMonth = new Date(formCalendarMonth);
                            newMonth.setMonth(newMonth.getMonth() + 1);
                            setFormCalendarMonth(newMonth);
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-1.5 py-0.5 rounded text-[10px] font-semibold"
                        >
                          ▶
                        </button>
                      </div>
                      
                      {/* Calendar Grid */}
                      <div className="grid grid-cols-7 gap-0.5">
                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                          <div key={i} className="text-center font-bold text-orange-900 text-[9px] py-0.5">
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
                            
                            const isBlocked = blockedDates.some(block => {
                              const blockStart = new Date(block.startDate);
                              const blockEnd = new Date(block.endDate);
                              return date >= blockStart && date <= blockEnd && block.status === 'blocked';
                            });
                            
                            const isReserved = reservedDates.some(res => {
                              const resStart = new Date(res.startDate);
                              const resEnd = new Date(res.endDate);
                              return date >= resStart && date <= resEnd;
                            });
                            
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
                                className={`aspect-square border rounded p-0.5 text-center text-[10px] font-semibold transition-all ${bgColor}`}
                              >
                                {day}
                              </button>
                            );
                          }
                          
                          return days;
                        })()}
                      </div>
                      
                      {/* Mini Legend */}
                      <div className="flex gap-1.5 mt-1.5 text-[10px] justify-center">
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
                      
                      <div className="flex gap-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, startDate: '', endDate: '', totalPrice: 0 }));
                            setDateError('');
                            setShowFormCalendar(false);
                          }}
                          className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 rounded text-[10px] font-semibold"
                        >
                          Limpar
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowFormCalendar(false)}
                          className="w-1/2 bg-orange-500 hover:bg-orange-600 text-white py-1 rounded text-[10px] font-semibold"
                        >
                          Fechar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {dateError && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-2 text-xs text-red-700 font-semibold">
                    {dateError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1">Número de Hóspedes</label>
                  <input
                    type="number"
                    name="guestsCount"
                    min="1"
                    value={formData.guestsCount}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                  />
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
                      disabled={formData.totalPrice === 0}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold transition-all text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Aplicar
                    </button>
                  </div>
                  {formData.totalPrice === 0 && voucherCode && (
                    <p className="text-xs text-gray-600 mt-1">💡 Selecione as datas primeiro para aplicar o voucher</p>
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
                
                {formData.totalPrice > 0 && (
                  <div className="bg-green-50 border-2 border-green-300 p-3 rounded-lg">
                    <p className="text-xs text-green-700 font-semibold mb-2">Resumo do Preço</p>
                    {liveNights > 0 && (
                      <p className="text-xs text-gray-700 mb-2">{liveNights} {liveNights === 1 ? 'noite' : 'noites'} selecionadas</p>
                    )}
                    {appliedVoucher ? (
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
                    ) : (
                      <p className="text-2xl font-bold text-green-800">€{formData.totalPrice.toFixed(2)}</p>
                    )}
                  </div>
                )}
                
                {dateError && (
                  <div className="bg-red-50 border-2 border-red-300 text-red-800 p-3 rounded-lg font-semibold text-xs">
                    ⚠️ {dateError}
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
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {loading ? '⏳ Processando...' : '🎯 Reservar Agora'}
                </button>
                {!canSubmitReservation && bookingStarted && (
                  <p className="text-xs text-gray-600 text-center">
                    Preencha todos os campos, selecione datas válidas e confirme o preço para concluir a reserva.
                  </p>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-16" style={deferredSectionStyle}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-orange-900 mb-6">Sobre o EnzoLoft</h2>
              <p className="text-gray-700 text-lg mb-4 leading-relaxed">
                Um refúgio encantador no coração do Alentejo, onde a natureza, conforto e charme se encontram. 
                Perfeito para casais, famílias ou amigos que procuram descanso e autenticidade.
              </p>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                Com piscina, jardim espaçoso e todas as comodidades modernas, oferecemos uma experiência inesquecível.
              </p>
              <div className="flex gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <p className="text-2xl font-bold text-orange-600">4.9</p>
                  <p className="text-sm text-gray-600">Avaliação</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <p className="text-2xl font-bold text-orange-600">500+</p>
                  <p className="text-sm text-gray-600">Hóspedes felizes</p>
                </div>
              </div>
            </div>
            <div className="relative w-full h-80 rounded-xl shadow-xl overflow-hidden">
              <Image
                src="https://enzoloft.web.app/images/about/casa-exterior.jpg"
                alt="Casa exterior"
                fill
                quality={70}
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
                decoding="async"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="bg-white py-16" style={deferredSectionStyle}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-orange-900 mb-12 text-center">Comodidades</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
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
                onClick={() => setSelectedImage(image)}
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
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-7xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 text-white text-4xl hover:text-orange-500 transition-colors"
              aria-label="Fechar"
            >
              ✕
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

      {/* Testimonials Section */}
      <section className="py-16 bg-white" style={deferredSectionStyle}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-orange-900 mb-4 text-center">⭐ O Que Dizem os Nossos Hóspedes</h2>
          <p className="text-center text-gray-600 mb-12 text-lg">Experiências reais de quem já nos visitou</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-orange-200">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  M
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-orange-900 text-lg">Maria Silva</h4>
                  <div className="flex text-yellow-500 text-sm">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>
              </div>
              <p className="text-gray-700 italic">
                &ldquo;Lugar maravilhoso! A casa tem tudo o que precisamos e a piscina é espetacular. 
                A tranquilidade do Alentejo combinada com todo o conforto. Voltaremos com certeza!&rdquo;
              </p>
              <p className="text-gray-500 text-sm mt-4">— Agosto 2025</p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-orange-200">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  J
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-orange-900 text-lg">João Pereira</h4>
                  <div className="flex text-yellow-500 text-sm">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>
              </div>
              <p className="text-gray-700 italic">
                &ldquo;Experiência incrível! A casa é ainda mais bonita ao vivo. 
                Localização perfeita para explorar o Alentejo. Os anfitriões são muito atenciosos. 
                Recomendo vivamente!&rdquo;
              </p>
              <p className="text-gray-500 text-sm mt-4">— Julho 2025</p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-orange-200">
              <div className="flex items-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-orange-400 to-red-400 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  A
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-orange-900 text-lg">Ana Costa</h4>
                  <div className="flex text-yellow-500 text-sm">
                    ⭐⭐⭐⭐⭐
                  </div>
                </div>
              </div>
              <p className="text-gray-700 italic">
                &ldquo;Passamos uma semana fantástica! O jardim é lindo, ideal para relaxar. 
                A cozinha tem tudo o que precisamos e o Wi-Fi funciona perfeitamente. 
                Um verdadeiro refúgio!&rdquo;
              </p>
              <p className="text-gray-500 text-sm mt-4">— Setembro 2025</p>
            </div>
          </div>

          {/* Overall Rating */}
          <div className="mt-12 text-center bg-gradient-to-r from-orange-100 to-red-100 rounded-xl p-8 border-2 border-orange-300">
            <div className="text-6xl font-bold text-orange-900 mb-2">4.9</div>
            <div className="flex justify-center text-yellow-500 text-2xl mb-2">
              ⭐⭐⭐⭐⭐
            </div>
            <p className="text-gray-700 text-lg font-semibold">Baseado em 47 avaliações</p>
          </div>
        </div>
      </section>

      <section className="py-14 bg-gradient-to-b from-white to-orange-50" style={deferredSectionStyle}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white border-2 border-orange-100 rounded-2xl shadow-xl p-6 md:p-8">
            <h2 className="text-3xl font-bold text-orange-900 mb-2">Fale Connosco</h2>
            <p className="text-gray-600 mb-6">
              Tem alguma questão sobre disponibilidade, preços ou condições da casa? Envie-nos uma mensagem.
            </p>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-orange-900 mb-1">Nome</label>
                  <input
                    type="text"
                    value={contactFormData.name}
                    onChange={(e) => setContactFormData((currentData) => ({ ...currentData, name: e.target.value }))}
                    placeholder="O seu nome"
                    required
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-orange-900 mb-1">Email</label>
                  <input
                    type="email"
                    value={contactFormData.email}
                    onChange={(e) => setContactFormData((currentData) => ({ ...currentData, email: e.target.value }))}
                    placeholder="seu@email.com"
                    required
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-orange-900 mb-1">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData((currentData) => ({ ...currentData, phone: e.target.value }))}
                  placeholder="+351 ..."
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-orange-900 mb-1">Mensagem</label>
                <textarea
                  value={contactFormData.message}
                  onChange={(e) => setContactFormData((currentData) => ({ ...currentData, message: e.target.value }))}
                  placeholder="Escreva aqui a sua mensagem"
                  required
                  rows={5}
                  className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
                />
              </div>

              <button
                type="submit"
                disabled={submittingContact}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingContact ? '⏳ A enviar...' : 'Enviar Mensagem'}
              </button>

              {contactFormMessage && (
                <p className="text-sm font-semibold text-gray-700">{contactFormMessage}</p>
              )}

              <p className="text-xs text-gray-500">
                Destinatário: alentejo.enzoloft@gmail.com
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-orange-900 to-red-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-4">EnzoLoft</h3>
            <p className="mb-4">{contactInfo.description}</p>
            <div className="flex justify-center gap-8 mb-6 text-sm">
              <span>📍 {contactInfo.location}</span>
              <span>📧 {contactInfo.email}</span>
              <span>📞 {contactInfo.phone}</span>
            </div>
          </div>
          
          {/* Google Maps */}
          {contactInfo.mapsUrl && 
           contactInfo.mapsUrl.trim() !== '' && 
           (contactInfo.mapsUrl.includes('google.com/maps/embed') || contactInfo.mapsUrl.includes('maps.google.com')) && (
            <div className="mb-8">
              <div className="max-w-4xl mx-auto">
                <iframe
                  src={contactInfo.mapsUrl}
                  width="100%"
                  height="400"
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
          
          {/* Admin Access Button */}
          <div className="text-center mb-6">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-white border-opacity-20 hover:border-opacity-40"
            >
              🔐 Acesso Admin
            </Link>
          </div>
          <p className="text-orange-200 text-sm text-center">© 2026 EnzoLoft. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
