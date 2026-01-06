import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
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
  const [contactInfo, setContactInfo] = useState({
    location: 'Vila Nova da Baronia, Évora',
    email: 'info@enzoloft.com',
    phone: '+351 XXX XXX XXX',
    description: 'Retiro de charme no coração do Alentejo',
    mapsUrl: ''
  });

  useEffect(() => {
    // API desativada no modo estático - sem datas bloqueadas
    setBlockedDates([]);
    
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
      return totalPrice;
    } catch (error) {
      console.error('Erro ao calcular preço:', error);
      return nightsCount * 100;
    }
  }, []);

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
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'reservations'), reservation);
      
      setMessage('✅ Reserva criada com sucesso! Aguardando confirmação do admin.');
      setFormData({ propertyId: '1', guestName: '', guestEmail: '', guestPhone: '', startDate: '', endDate: '', guestsCount: 1, totalPrice: 0 });
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

      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-r from-orange-600 via-red-500 to-orange-500">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative h-full flex flex-col justify-center items-center text-white text-center px-4">
          <h2 className="text-5xl md:text-6xl font-bold mb-4 drop-shadow-lg">Retiro Perfeito no Alentejo</h2>
          <p className="text-xl md:text-2xl mb-8 drop-shadow-md">Alojamento de charme em Vila Nova da Baronia</p>
          <div className="flex gap-6 text-lg flex-wrap justify-center">
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm"> Wi-Fi Gratuito</span>
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm"> Piscina</span>
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm"> Jardim</span>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="max-w-7xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-2xl p-10 shadow-xl border-2 border-orange-100">
          <h2 className="text-4xl font-bold text-orange-900 mb-8 text-center">Verificar Disponibilidade</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-orange-900 mb-2">Check-in</label>
              <input
                type="date"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-orange-900 mb-2">Check-out</label>
              <input
                type="date"
                name="endDate"
                required
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-orange-900 mb-2">Hóspedes</label>
              <input
                type="number"
                name="guestsCount"
                min="1"
                value={formData.guestsCount}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white transition"
              />
            </div>
            <button
              type="submit"
              disabled={loading || dateError !== ''}
              className="bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3 rounded-lg hover:shadow-lg hover:shadow-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? ' Verificando...' : ' Disponível?'}
            </button>
          </form>
          
          {dateError && (
            <div className="mt-6 bg-red-50 border-2 border-red-300 text-red-800 p-4 rounded-lg font-semibold">
               {dateError}
            </div>
          )}
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

      {/* Reservation Form */}
      <section className="bg-white py-16">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-orange-900 mb-8 text-center">Fazer Reserva</h2>
          <form onSubmit={handleSubmit} className="bg-gradient-to-br from-orange-50 to-red-50 p-10 rounded-2xl shadow-xl border-2 border-orange-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-orange-900 mb-2">Nome *</label>
                <input
                  type="text"
                  name="guestName"
                  required
                  value={formData.guestName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-orange-900 mb-2">Email *</label>
                <input
                  type="email"
                  name="guestEmail"
                  required
                  value={formData.guestEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-orange-900 mb-2">Telefone</label>
                <input
                  type="tel"
                  name="guestPhone"
                  value={formData.guestPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-orange-900 mb-2">Hóspedes *</label>
                <input
                  type="number"
                  name="guestsCount"
                  min="1"
                  value={formData.guestsCount}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-orange-900 mb-2">Check-in *</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-orange-900 mb-2">Check-out *</label>
                <input
                  type="date"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
              </div>
              <div className="md:col-span-2">
                {formData.startDate && formData.endDate && formData.totalPrice > 0 && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 p-6 rounded-xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-semibold text-gray-700">💰 Resumo da Reserva</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-gray-600">
                        <span>📅 Noites:</span>
                        <span className="font-semibold">{nights} {nights === 1 ? 'noite' : 'noites'}</span>
                      </div>
                      <div className="border-t-2 border-green-200 pt-2 mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-green-800">Total:</span>
                          <span className="text-3xl font-bold text-green-600">€{formData.totalPrice.toFixed(2)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">* Preço calculado automaticamente baseado nas datas selecionadas</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {dateError && (
              <div className="bg-red-50 border-2 border-red-300 text-red-800 p-4 rounded-lg font-semibold">
                {dateError}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading || dateError !== ''}
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-4 rounded-lg font-bold text-lg hover:shadow-lg hover:shadow-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            >
              {loading ? ' Processando...' : ' Reservar Agora'}
            </button>
            
            {message && (
              <div className={`p-4 rounded-lg font-semibold ${message.includes('') ? 'bg-red-50 text-red-800 border-2 border-red-300' : 'bg-green-50 text-green-800 border-2 border-green-300'}`}>
                {message}
              </div>
            )}
          </form>
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
