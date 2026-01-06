import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, getDocs } from 'firebase/firestore';
import { sendNewReservationEmail } from '../lib/emailService';

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
  const [dateError, setDateError] = useState<string>('');
  const [nights, setNights] = useState<number>(0);
  const [voucherCode, setVoucherCode] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [contactInfo, setContactInfo] = useState({
    location: 'Vila Nova da Baronia, Évora',
    email: 'info@enzoloft.com',
    phone: '+351 XXX XXX XXX',
    description: 'Retiro de charme no coração do Alentejo',
    mapsUrl: ''
  });

  useEffect(() => {
    // Carregar datas bloqueadas do Firestore
    const loadBlockedDates = async () => {
      try {
        const availabilitySnapshot = await getDocs(collection(db, 'availability'));
        const blockedData = availabilitySnapshot.docs.map(doc => doc.data() as BlockedDate);
        setBlockedDates(blockedData);
      } catch (error) {
        console.error('Erro ao carregar datas bloqueadas:', error);
      }
    };
    
    // Carregar informações de contacto do Firestore
    const loadContactInfo = async () => {
      try {
        const docRef = doc(db, 'settings', 'contactInfo');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setContactInfo(docSnap.data() as any);
        }
      } catch (error) {
        console.error('Erro ao carregar informações de contacto:', error);
      }
    };
    
    loadBlockedDates();
    loadContactInfo();
  }, []);

  const isDateBlocked = useCallback((date: string): boolean => {
    const checkDate = new Date(date);
    return blockedDates.some(block => {
      const blockStart = new Date(block.startDate);
      const blockEnd = new Date(block.endDate);
      return checkDate >= blockStart && checkDate <= blockEnd && block.status === 'blocked';
    });
  }, [blockedDates]);
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
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        // Calcular preço total
        const calculatedPrice = await calculateTotalPrice(start, end);
        setFormData(prev => ({ ...prev, totalPrice: calculatedPrice }));
        
        let hasBlockedDate = false;
        let currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          if (isDateBlocked(currentDate.toISOString().split('T')[0])) {
            hasBlockedDate = true;
            break;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
        
        if (hasBlockedDate) {
          setDateError('❌ Uma ou mais datas selecionadas estão bloqueadas. Escolha outras datas.');
        }
      }
    }
  }, [formData.startDate, formData.endDate, isDateBlocked, calculateTotalPrice]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (dateError) {
      setMessage('❌ Por favor, escolha datas válidas sem bloqueios.');
      setLoading(false);
      return;
    }

    try {
      // Guardar reserva no Firestore
      const reservation = {
        ...formData,
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
      
      await addDoc(collection(db, 'reservations'), reservation);
      
      // Enviar email de confirmação
      const emailSent = await sendNewReservationEmail({
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone,
        startDate: formData.startDate,
        endDate: formData.endDate,
        guestsCount: formData.guestsCount,
        totalPrice: formData.totalPrice.toString(),
        status: 'pending',
        voucherCode: appliedVoucher?.code,
        discount: discount
      });

      if (emailSent) {
        setMessage('✅ Reserva criada com sucesso! Email de confirmação enviado. Aguardando confirmação do admin.');
      } else {
        setMessage('✅ Reserva criada com sucesso! Aguardando confirmação do admin. (Aviso: email não enviado)');
      }
      
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
  }, [dateError, formData]);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl"></span>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">EnzoLoft</h1>
          </div>
          <a href="#booking" className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-2 rounded-full hover:shadow-lg hover:shadow-orange-300 transition-all font-semibold">
            Reservar Agora
          </a>
        </div>
      </header>

      {/* Hero Section with Booking Form */}
      <section id="booking" className="bg-gradient-to-r from-orange-600 via-red-500 to-orange-500 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Hero Content - Left Side */}
            <div className="text-white">
              <h2 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">Retiro Perfeito no Alentejo</h2>
              <p className="text-xl md:text-2xl mb-8 drop-shadow-md">Alojamento de charme em Vila Nova da Baronia</p>
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-orange-900 mb-1">Check-in</label>
                    <input
                      type="date"
                      name="startDate"
                      required
                      value={formData.startDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-orange-900 mb-1">Check-out</label>
                    <input
                      type="date"
                      name="endDate"
                      required
                      value={formData.endDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition text-sm"
                    />
                  </div>
                </div>
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
            <img
              src="https://enzoloft.web.app/images/about/casa-exterior.jpg"
              alt="Casa exterior"
              className="w-full h-80 object-cover rounded-xl shadow-xl"
            />
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
              <div key={idx} className="relative h-64 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black opacity-0 hover:opacity-20 transition-opacity duration-300"></div>
              </div>
            ))}
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
          {contactInfo.mapsUrl && contactInfo.mapsUrl.trim() !== '' && (
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
            <a
              href="/admin/login"
              className="inline-flex items-center gap-2 bg-white bg-opacity-10 hover:bg-opacity-20 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 backdrop-blur-sm border border-white border-opacity-20 hover:border-opacity-40"
            >
              🔐 Acesso Admin
            </a>
          </div>
          <p className="text-orange-200 text-sm text-center">© 2026 EnzoLoft. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
