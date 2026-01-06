import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [formData, setFormData] = useState({
    propertyId: '1',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    startDate: '',
    endDate: '',
    guestsCount: 1,
    totalPrice: 0,
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [dateError, setDateError] = useState('');

  useEffect(() => {
    fetch('/api/admin/availability')
      .then(res => res.json())
      .then(data => setBlockedDates(data))
      .catch(err => console.error('Erro ao carregar datas bloqueadas:', err));
  }, []);

  const isDateBlocked = (date: string): boolean => {
    const checkDate = new Date(date);
    return blockedDates.some(block => {
      const blockStart = new Date(block.startDate);
      const blockEnd = new Date(block.endDate);
      return checkDate >= blockStart && checkDate <= blockEnd && block.status === 'blocked';
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setDateError('');

    if (name === 'startDate' || name === 'endDate') {
      const start = name === 'startDate' ? value : formData.startDate;
      const end = name === 'endDate' ? value : formData.endDate;
      
      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        
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
          setDateError('âš ï¸ Uma ou mais datas selecionadas estÃ£o bloqueadas. Escolha outras datas.');
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (dateError) {
      setMessage('âŒ Por favor, escolha datas vÃ¡lidas sem bloqueios.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('âœ… Reserva criada com sucesso! Aguardando confirmaÃ§Ã£o do admin.');
        setFormData({ propertyId: '1', guestName: '', guestEmail: '', guestPhone: '', startDate: '', endDate: '', guestsCount: 1, totalPrice: 0 });
      } else {
        setMessage(`âŒ Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage('âŒ Erro ao criar reserva.');
    } finally {
      setLoading(false);
    }
  };

  const amenities = [
    { icon: 'ðŸ“¶', label: 'Wi-Fi Gratuito' },
    { icon: 'â„ï¸', label: 'Ar Condicionado' },
    { icon: 'ðŸ³', label: 'Cozinha Equipada' },
    { icon: 'ðŸš—', label: 'Estacionamento' },
    { icon: 'ðŸŠ', label: 'Piscina' },
    { icon: 'ðŸŒ¿', label: 'Jardim' },
  ];

  const galleryImages = [
    { src: 'https://enzoloft.web.app/images/gallery/exterior.jpg', alt: 'Exterior' },
    { src: 'https://enzoloft.web.app/images/gallery/patio.jpg', alt: 'PÃ¡tio' },
    { src: 'https://enzoloft.web.app/images/gallery/sala.jpg', alt: 'Sala' },
    { src: 'https://enzoloft.web.app/images/gallery/cozinha.jpg', alt: 'Cozinha' },
    { src: 'https://enzoloft.web.app/images/gallery/quarto.jpg', alt: 'Quarto' },
    { src: 'https://enzoloft.web.app/images/gallery/casa-banho.jpg', alt: 'Casa de banho' },
    { src: 'https://enzoloft.web.app/images/gallery/vista.jpg', alt: 'Vista' },
    { src: 'https://enzoloft.web.app/images/gallery/piscina.jpg', alt: 'Piscina' },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b-2 border-orange-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-5 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-3xl">ðŸ¡</span>
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
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">âœ“ Wi-Fi Gratuito</span>
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">âœ“ Piscina</span>
            <span className="bg-white bg-opacity-20 px-4 py-2 rounded-full backdrop-blur-sm">âœ“ Jardim</span>
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
              <label className="block text-sm font-semibold text-orange-900 mb-2">HÃ³spedes</label>
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
              {loading ? 'â³ Verificando...' : 'âœ“ DisponÃ­vel?'}
            </button>
          </form>
          
          {dateError && (
            <div className="mt-6 bg-red-50 border-2 border-red-300 text-red-800 p-4 rounded-lg font-semibold">
              ðŸš« {dateError}
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
                Um refÃºgio encantador no coraÃ§Ã£o do Alentejo, onde a natureza, conforto e charme se encontram. 
                Perfeito para casais, famÃ­lias ou amigos que procuram descanso e autenticidade.
              </p>
              <p className="text-gray-700 text-lg mb-6 leading-relaxed">
                Com piscina, jardim espaÃ§oso e todas as comodidades modernas, oferecemos uma experiÃªncia inesquecÃ­vel.
              </p>
              <div className="flex gap-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <p className="text-2xl font-bold text-orange-600">4.9â˜…</p>
                  <p className="text-sm text-gray-600">AvaliaÃ§Ã£o</p>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <p className="text-2xl font-bold text-orange-600">500+</p>
                  <p className="text-sm text-gray-600">HÃ³spedes felizes</p>
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
                <label className="block text-sm font-semibold text-orange-900 mb-2">HÃ³spedes *</label>
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
                <label className="block text-sm font-semibold text-orange-900 mb-2">PreÃ§o Total (â‚¬) *</label>
                <input
                  type="number"
                  name="totalPrice"
                  min="0"
                  step="0.01"
                  required
                  value={formData.totalPrice}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                />
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
              {loading ? 'â³ Processando...' : 'ðŸŽ‰ Reservar Agora'}
            </button>
            
            {message && (
              <div className={`p-4 rounded-lg font-semibold ${message.includes('âŒ') ? 'bg-red-50 text-red-800 border-2 border-red-300' : 'bg-green-50 text-green-800 border-2 border-green-300'}`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-orange-900 to-red-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">EnzoLoft</h3>
          <p className="mb-4">Retiro de charme no coraÃ§Ã£o do Alentejo</p>
          <div className="flex justify-center gap-8 mb-6 text-sm">
            <span>ðŸ“ Vila Nova da Baronia, Ã‰vora</span>
            <span>ðŸ“§ info@enzoloft.com</span>
            <span>ðŸ“± +351 XXX XXX XXX</span>
          </div>
          <p className="text-orange-200 text-sm">© 2026 EnzoLoft. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
