import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import PresentationModePage from '../components/PresentationModePage';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, getDocs } from 'firebase/firestore';

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

interface SiteMode {
  presentationModeEnabled?: boolean;
}

export default function Home() {
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
  const [calendarMonth, setCalendarMonth] = useState<Date>(new Date());
  const [showFormCalendar, setShowFormCalendar] = useState<boolean>(false);
  const [formCalendarMonth, setFormCalendarMonth] = useState<Date>(new Date());
  const [selectedImage, setSelectedImage] = useState<{src: string, alt: string} | null>(null);
  const [presentationModeEnabled, setPresentationModeEnabled] = useState<boolean>(false);
  const [siteModeLoaded, setSiteModeLoaded] = useState<boolean>(false);
  const [contactInfo, setContactInfo] = useState({
    location: 'Vila Ruiva, Cuba - Beja',
    email: 'info@enzoloft.com',
    phone: '+351 XXX XXX XXX',
    description: 'Retiro de charme no coração do Alentejo',
    mapsUrl: ''
  });

  useEffect(() => {
    const loadAllData = async () => {
      try {
        // Carregar tudo em paralelo para melhor performance
        const [availabilitySnapshot, reservationsSnapshot, contactDoc, siteModeDoc] = await Promise.all([
          getDocs(collection(db, 'availability')),
          getDocs(collection(db, 'reservations')),
          getDoc(doc(db, 'settings', 'contactInfo')),
          getDoc(doc(db, 'settings', 'siteMode'))
        ]);
        
        // Datas bloqueadas
        const blockedData = availabilitySnapshot.docs.map(doc => doc.data() as BlockedDate);
        setBlockedDates(blockedData);
        
        // Reservas confirmadas
        const confirmedReservations = reservationsSnapshot.docs
          .map(doc => doc.data())
          .filter(res => res.status === 'confirmed')
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
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
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
      return;
    }

    const currentPrice = originalPrice > 0 ? originalPrice : formData.totalPrice;
    
    if (currentPrice === 0) {
      setVoucherError('Selecione as datas primeiro para aplicar o voucher.');
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
    } catch (error) {
      console.error('Erro ao validar voucher:', error);
      setVoucherError('Erro ao validar voucher. Tente novamente.');
    }
  }, [voucherCode, originalPrice, formData.totalPrice]);
  const calculateTotalPrice = useCallback(async (startDate: string, endDate: string): Promise<number> => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    
    if (end <= start) return 0;
    
    const nightsCount = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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
        const dateStr = currentDate.toISOString().split('T')[0];
        
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
      return nightsCount * 100;
    }
  }, [appliedVoucher]);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setDateError('');

    if (name === 'startDate' || name === 'endDate') {
      const start = name === 'startDate' ? value : formData.startDate;
      const end = name === 'endDate' ? value : formData.endDate;
      
      if (start && end) {
        // Verificar conflitos de datas
        const conflict = checkDateRangeConflict(start, end);
        
        if (conflict.hasConflict) {
          setDateError(conflict.message);
          setFormData(prev => ({ ...prev, totalPrice: 0 }));
          setNights(0);
        } else {
          // Calcular preço total apenas se não houver conflito
          const calculatedPrice = await calculateTotalPrice(start, end);
          setFormData(prev => ({ ...prev, totalPrice: calculatedPrice }));
        }
      }
    }
  }, [formData.startDate, formData.endDate, checkDateRangeConflict, calculateTotalPrice]);

  const handleDateSelect = useCallback(async (dateStr: string, type: 'start' | 'end') => {
    const newFormData = { ...formData };
    
    if (type === 'start') {
      newFormData.startDate = dateStr;
      // Se já existir endDate e for anterior ao novo startDate, limpar
      if (newFormData.endDate && newFormData.endDate <= dateStr) {
        newFormData.endDate = '';
      }
    } else {
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
      }
    }
  }, [formData, checkDateRangeConflict, calculateTotalPrice]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Validações básicas
    if (dateError) {
      setMessage('❌ Por favor, escolha datas válidas sem bloqueios.');
      setLoading(false);
      return;
    }

    if (!formData.guestName.trim() || formData.guestName.length < 3) {
      setMessage('❌ Por favor, insira um nome válido (mínimo 3 caracteres).');
      setLoading(false);
      return;
    }

    if (!formData.guestEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setMessage('❌ Por favor, insira um email válido.');
      setLoading(false);
      return;
    }

    if (!formData.guestPhone.trim() || formData.guestPhone.length < 9) {
      setMessage('❌ Por favor, insira um telefone válido.');
      setLoading(false);
      return;
    }

    if (formData.guestsCount < 1 || formData.guestsCount > 20) {
      setMessage('❌ Número de hóspedes inválido (1-20).');
      setLoading(false);
      return;
    }

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
      
      // Enviar emails (confirmação para hóspede + notificação para admin)
      try {
        // Email de confirmação para o hóspede
        await fetch('/api/send-email', {
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
        await fetch('/api/send-email', {
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
      } catch (emailError) {
        console.error('Erro ao enviar emails:', emailError);
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
      setMessage('❌ Erro ao criar reserva. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [appliedVoucher, dateError, discount, formData, nights, originalPrice]);

  const amenities = useMemo(() => [
    { icon: '📶', label: 'Wi-Fi Gratuito' },
    { icon: '❄️', label: 'Ar Condicionado' },
    { icon: '🍳', label: 'Cozinha Equipada' },
    { icon: '🚗', label: 'Estacionamento' },
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

  if (!siteModeLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-orange-600"></div>
      </div>
    );
  }

  if (presentationModeEnabled) {
    return (
      <PresentationModePage
        amenities={amenities}
        galleryImages={galleryImages}
        contactInfo={contactInfo}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Head>
        <title>EnzoLoft - Alojamento de Charme em Vila Ruiva, Cuba - Beja</title>
        <meta name="description" content="Retiro de charme no coração do Alentejo. Reserve agora o seu alojamento exclusivo em Vila Ruiva, Cuba - Beja. Casa completa com piscina, jardim e vistas deslumbrantes." />
        <meta name="keywords" content="alojamento alentejo, casa férias beja, vila ruiva, cuba alentejo, casa com piscina, turismo rural" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="EnzoLoft - Alojamento de Charme no Alentejo" />
        <meta property="og:description" content="Retiro de charme em Vila Ruiva, Cuba - Beja. Reserve a sua estadia exclusiva." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://enzoloft-51508.web.app" />
        <link rel="canonical" href="https://enzoloft-51508.web.app" />
      </Head>
      
      {/* Header */}
      <header className="bg-white border-b-2 border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl"></span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">EnzoLoft</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => document.getElementById('availability-calendar')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-2 rounded-full hover:shadow-lg hover:shadow-purple-300 transition-all font-semibold"
            >
              📅 Verificar Disponibilidade
            </button>
            <a href="#booking" className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full hover:shadow-lg hover:shadow-orange-300 transition-all font-semibold">
              Reservar Agora
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section with Booking Form */}
      <section id="booking" className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 relative">
          <Image
            src="https://images.unsplash.com/photo-1542224566-6e85f2e6772f?w=1920&q=80"
            alt="Pôr do sol no Alentejo - Portugal"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 opacity-50"></div>
        </div>
        
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
                    value={formData.guestPhone}
                    onChange={handleChange}
                    placeholder="+351 ..."
                    className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-orange-900 mb-1">Selecione as datas</label>
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
                  
                  {showFormCalendar && (
                    <div className="mt-1.5 border border-orange-300 rounded p-1.5 bg-white shadow-lg">
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
                            const dateStr = date.toISOString().split('T')[0];
                            
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
                            
                            let bgColor = 'bg-green-100 border-green-300 hover:bg-green-200 cursor-pointer';
                            let disabled = false;
                            
                            if (isPast) {
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
                      
                      <button
                        type="button"
                        onClick={() => setShowFormCalendar(false)}
                        className="w-full mt-1.5 bg-orange-500 hover:bg-orange-600 text-white py-0.5 rounded text-[10px] font-semibold"
                      >
                        Confirmar
                      </button>
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
                  disabled={loading || dateError !== ''}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                >
                  {loading ? '⏳ Processando...' : '🎯 Reservar Agora'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-16">
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
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="bg-white py-16">
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
      <section className="bg-gradient-to-r from-orange-50 to-red-50 py-16">
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
                  sizes="(max-width: 768px) 100vw, 25vw"
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
              sizes="100vw"
              className="max-w-full max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-white text-center mt-4 text-xl">{selectedImage.alt}</p>
          </div>
        </div>
      )}

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
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

      {/* Availability Calendar */}
      <section id="availability-calendar" className="py-12 bg-white">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-orange-900 mb-3 text-center">📅 Disponibilidade</h2>
          <p className="text-center text-gray-600 mb-6 text-sm">Consulte as datas disponíveis para a sua estadia</p>
          
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl shadow-xl p-4 border-2 border-orange-200">
            {/* Calendar Navigation */}
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => {
                  const newMonth = new Date(calendarMonth);
                  newMonth.setMonth(newMonth.getMonth() - 1);
                  setCalendarMonth(newMonth);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all text-sm"
              >
                ◀
              </button>
              <h3 className="text-xl font-bold text-orange-900">
                {calendarMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
              </h3>
              <button
                onClick={() => {
                  const newMonth = new Date(calendarMonth);
                  newMonth.setMonth(newMonth.getMonth() + 1);
                  setCalendarMonth(newMonth);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-all text-sm"
              >
                ▶
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                <div key={day} className="text-center font-bold text-orange-900 py-1 text-xs">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {(() => {
                const year = calendarMonth.getFullYear();
                const month = calendarMonth.getMonth();
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const days = [];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // Empty cells before first day
                for (let i = 0; i < firstDay; i++) {
                  days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
                }
                
                // Days of the month
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(year, month, day);
                  const dateStr = date.toISOString().split('T')[0];
                  
                  // Check if date is blocked
                  const isBlocked = blockedDates.some(block => {
                    const blockStart = new Date(block.startDate);
                    const blockEnd = new Date(block.endDate);
                    return date >= blockStart && date <= blockEnd && block.status === 'blocked';
                  });
                  
                  // Check if date is reserved
                  const isReserved = reservedDates.some(res => {
                    const resStart = new Date(res.startDate);
                    const resEnd = new Date(res.endDate);
                    return date >= resStart && date <= resEnd;
                  });
                  
                  const isToday = today.getTime() === date.getTime();
                  const isPast = date < today;
                  
                  // Determinar estilo baseado no estado da data
                  let bgColor = 'bg-green-100 border-green-300 hover:bg-green-200'; // Disponível
                  let icon = '';
                  
                  if (isPast) {
                    bgColor = 'bg-gray-100 text-gray-400 border-gray-200';
                  } else if (isBlocked) {
                    bgColor = 'bg-red-200 border-red-400 cursor-not-allowed';
                    icon = '🔒';
                  } else if (isReserved) {
                    bgColor = 'bg-orange-200 border-orange-400 cursor-not-allowed';
                    icon = '📅';
                  }
                  
                  if (isToday) {
                    bgColor = bgColor + ' ring-2 ring-blue-500';
                  }
                  
                  days.push(
                    <div
                      key={day}
                      className={`aspect-square border rounded-lg p-1 text-center transition-all ${bgColor}`}
                    >
                      <div className="text-xs font-semibold">{day}</div>
                      {icon && (
                        <div className="text-xs">{icon}</div>
                      )}
                    </div>
                  );
                }
                
                return days;
              })()}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-3 mt-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
                <span className="text-gray-700">Disponível</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-orange-200 border border-orange-400 rounded flex items-center justify-center text-xs">📅</div>
                <span className="text-gray-700">Reservado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 bg-red-200 border border-red-400 rounded flex items-center justify-center text-xs">🔒</div>
                <span className="text-gray-700">Bloqueado</span>
              </div>
            </div>
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
