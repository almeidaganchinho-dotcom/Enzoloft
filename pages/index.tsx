import React, { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    propertyId: '1', // Assuming a default property ID
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
      } else {
        setMessage(`Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage('Erro ao criar reserva.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Enzo Loft</h1>
          <p className="mt-2 text-sm text-gray-600">Reservas sem complicações</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Fazer Reserva</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="guestName" className="block text-sm font-medium text-gray-700">Nome do Hóspede</label>
                    <input
                      type="text"
                      name="guestName"
                      id="guestName"
                      required
                      value={formData.guestName}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="guestEmail" className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      name="guestEmail"
                      id="guestEmail"
                      required
                      value={formData.guestEmail}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="guestPhone" className="block text-sm font-medium text-gray-700">Telefone</label>
                    <input
                      type="tel"
                      name="guestPhone"
                      id="guestPhone"
                      value={formData.guestPhone}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="guestsCount" className="block text-sm font-medium text-gray-700">Número de Hóspedes</label>
                    <input
                      type="number"
                      name="guestsCount"
                      id="guestsCount"
                      min="1"
                      value={formData.guestsCount}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Data de Check-in</label>
                    <input
                      type="date"
                      name="startDate"
                      id="startDate"
                      required
                      value={formData.startDate}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">Data de Check-out</label>
                    <input
                      type="date"
                      name="endDate"
                      id="endDate"
                      required
                      value={formData.endDate}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700">Preço Total (€)</label>
                    <input
                      type="number"
                      name="totalPrice"
                      id="totalPrice"
                      min="0"
                      step="0.01"
                      required
                      value={formData.totalPrice}
                      onChange={handleChange}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? 'A criar...' : 'Criar Reserva'}
                  </button>
                </div>
              </form>
              {message && (
                <div className={`mt-4 p-4 rounded-md ${message.includes('Erro') ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}