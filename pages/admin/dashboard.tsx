import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<{ email: string } | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reservations');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const email = localStorage.getItem('adminEmail');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    setAdmin({ email: email || 'Admin' });
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/admin/reservations');
      const data = await response.json();
      setReservations(data || []);
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reservationId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        fetchReservations();
      }
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    router.push('/admin/login');
  };

  if (!admin) {
    return <div className="min-h-screen bg-gray-100"></div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-amber-900 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">EnzoLoft Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">{admin.email}</span>
            <button
              onClick={handleLogout}
              className="bg-amber-700 hover:bg-amber-800 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar & Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4 space-y-2">
              <button
                onClick={() => setActiveTab('reservations')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'reservations'
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📅 Reservas
              </button>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'statistics'
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                📊 Estatísticas
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-amber-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                ⚙️ Configurações
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'reservations' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-amber-900 mb-6">Gestão de Reservas</h2>

                {loading ? (
                  <p className="text-gray-500">Carregando...</p>
                ) : reservations.length === 0 ? (
                  <p className="text-gray-500">Nenhuma reserva encontrada</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hóspede</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-in</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check-out</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {reservations.map((res: any) => (
                          <tr key={res.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{res.guestName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{res.guestEmail}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(res.startDate).toLocaleDateString('pt-PT')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {new Date(res.endDate).toLocaleDateString('pt-PT')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  res.status === 'confirmed'
                                    ? 'bg-green-100 text-green-800'
                                    : res.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {res.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                              {res.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(res.id, 'confirmed')}
                                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(res.id, 'cancelled')}
                                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                                  >
                                    Cancelar
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'statistics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Total de Reservas</h3>
                  <p className="text-4xl font-bold text-amber-600">{reservations.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Pendentes</h3>
                  <p className="text-4xl font-bold text-yellow-600">
                    {reservations.filter(r => r.status === 'pending').length}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Confirmadas</h3>
                  <p className="text-4xl font-bold text-green-600">
                    {reservations.filter(r => r.status === 'confirmed').length}
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-2">Canceladas</h3>
                  <p className="text-4xl font-bold text-red-600">
                    {reservations.filter(r => r.status === 'cancelled').length}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-amber-900 mb-6">Configurações</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Informações do Site</h3>
                    <p className="text-gray-600 mb-4">EnzoLoft - Alojamento em Vila Nova da Baronia</p>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email de Contacto</label>
                        <input
                          type="email"
                          defaultValue="info@enzoloft.com"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                        <input
                          type="tel"
                          defaultValue="+351 000 000 000"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      <button className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700">
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}