import React, { useState } from 'react';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Reserva criada com sucesso! Aguardando confirmação do admin.');
        setFormData({ propertyId: '1', guestName: '', guestEmail: '', guestPhone: '', startDate: '', endDate: '', guestsCount: 1, totalPrice: 0 });
      } else {
        setMessage(`Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage('Erro ao criar reserva.');
    } finally {
      setLoading(false);
    }
  };

  const amenities = [
    { icon: '📶', label: 'Free Wi-Fi' },
    { icon: '❄️', label: 'Air conditioning' },
    { icon: '🍳', label: 'Equipped kitchen' },
    { icon: '🚗', label: 'Free parking' },
    { icon: '🏊', label: 'Swimming pool' },
    { icon: '🌿', label: 'Garden' },
  ];

  const galleryImages = [
    { src: 'https://enzoloft.web.app/images/gallery/exterior.jpg', alt: 'Exterior' },
    { src: 'https://enzoloft.web.app/images/gallery/patio.jpg', alt: 'Pátio' },
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-amber-900">EnzoLoft</h1>
          <a href="#booking" className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700">
            Book now
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative h-96 bg-gradient-to-r from-amber-900 to-amber-700">
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <div className="relative h-full flex flex-col justify-center items-center text-white text-center px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Retreat in the heart of Alentejo</h2>
          <p className="text-lg md:text-xl mb-8">Short-stay rental in Vila Nova da Baronia, Évora</p>
          <div className="flex gap-4 text-sm">
            <span>✓ Free Wi-Fi</span>
            <span>✓ Swimming pool</span>
            <span>✓ Garden</span>
          </div>
        </div>
      </section>

      {/* Booking Section */}
      <section id="booking" className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-amber-900 mb-6">Check Availability</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Check-in</label>
              <input
                type="date"
                name="startDate"
                required
                value={formData.startDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Check-out</label>
              <input
                type="date"
                name="endDate"
                required
                value={formData.endDate}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Guests</label>
              <input
                type="number"
                name="guestsCount"
                min="1"
                value={formData.guestsCount}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </form>
        </div>
      </section>

      {/* About Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-4xl font-bold text-amber-900 mb-6">About EnzoLoft</h2>
            <p className="text-gray-700 mb-4 leading-relaxed">
              EnzoLoft is a local accommodation house located in Vila Nova da Baronia, in the heart of Alentejo. With 1 bedroom and capacity for up to 4 people, we offer a peaceful and welcoming retreat with boho chic style inspired by traditional Alentejo houses.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Com 1 quarto e capacidade para até 4 pessoas, o EnzoLoft é perfeito para casais, pequenas famílias ou amigos que procuram uma experiência autêntica no Alentejo.
            </p>
          </div>
          <div className="relative h-96">
            <img
              src="https://enzoloft.web.app/images/about/casa-exterior.jpg"
              alt="Casa exterior"
              className="w-full h-full object-cover rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section className="bg-amber-50 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-amber-900 mb-12 text-center">Amenities</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {amenities.map((amenity, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl mb-4">{amenity.icon}</div>
                <h3 className="text-lg font-semibold text-gray-900">{amenity.label}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-4xl font-bold text-amber-900 mb-12 text-center">Gallery</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {galleryImages.map((image, idx) => (
            <div key={idx} className="relative h-64 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
              <img
                src={image.src}
                alt={image.alt}
                className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Reservation Form */}
      <section className="bg-amber-50 py-16">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-amber-900 mb-8">Make a Reservation</h2>
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-lg space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guest Name *</label>
                <input
                  type="text"
                  name="guestName"
                  required
                  value={formData.guestName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  name="guestEmail"
                  required
                  value={formData.guestEmail}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  name="guestPhone"
                  value={formData.guestPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guests *</label>
                <input
                  type="number"
                  name="guestsCount"
                  min="1"
                  value={formData.guestsCount}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-in *</label>
                <input
                  type="date"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-out *</label>
                <input
                  type="date"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Price (€) *</label>
                <input
                  type="number"
                  name="totalPrice"
                  min="0"
                  step="0.01"
                  required
                  value={formData.totalPrice}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 text-white py-3 rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Booking...' : 'Book Now'}
            </button>
            {message && (
              <div className={`p-4 rounded-lg ${message.includes('Erro') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                {message}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-amber-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold mb-4">Contact</h3>
              <p>📧 info@enzoloft.com</p>
              <p>📱 +351 000 000 000</p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Location</h3>
              <p>Vila Nova da Baronia</p>
              <p>Évora, Alentejo</p>
              <p>Portugal</p>
            </div>
            <div>
              <h3 className="text-lg font-bold mb-4">Follow Us</h3>
              <p>📲 Instagram: @enzoloft</p>
            </div>
          </div>
          <div className="border-t border-amber-700 pt-8 text-center">
            <p>&copy; 2025 EnzoLoft · Vila Nova da Baronia, Alentejo</p>
          </div>
        </div>
      </footer>
    </div>
  );
}