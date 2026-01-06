import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<{ email: string } | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();

  const COLORS = ['#b45309', '#f59e0b'];

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const email = localStorage.getItem('adminEmail');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    setAdmin({ email: email || 'Admin' });
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const [resRes, pricesRes, availRes, vouchersRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/reservations'),
        fetch('/api/admin/prices'),
        fetch('/api/admin/availability'),
        fetch('/api/admin/vouchers'),
        fetch('/api/admin/analytics'),
      ]);

      if (resRes.ok) setReservations(await resRes.json());
      if (pricesRes.ok) setPrices(await pricesRes.json());
      if (availRes.ok) setAvailability(await availRes.json());
      if (vouchersRes.ok) setVouchers(await vouchersRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (reservationId: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchAllData();
    } catch (error) {
      console.error('Erro ao atualizar reserva:', error);
    }
  };

  const addPrice = () => {
    const newPrice = {
      id: prices.length + 1,
      season: 'New Season',
      pricePerNight: 100,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
    setPrices([...prices, newPrice]);
  };

  const addAvailability = () => {
    const newAvail = {
      id: availability.length + 1,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      status: 'available',
      reason: '',
    };
    setAvailability([...availability, newAvail]);
  };

  const addVoucher = () => {
    const newVoucher = {
      id: vouchers.length + 1,
      code: 'NEW' + Math.random().toString(36).substring(7).toUpperCase(),
      discount: 10,
      type: 'percentage',
      expiry: new Date().toISOString().split('T')[0],
      usage: 0,
      maxUses: 100,
    };
    setVouchers([...vouchers, newVoucher]);
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
              className="bg-amber-700 hover:bg-amber-800 px-4 py-2 rounded-lg"
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
              {['dashboard', 'reservations', 'prices', 'availability', 'vouchers', 'analytics'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-amber-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {tab === 'dashboard' && '📊 Dashboard'}
                  {tab === 'reservations' && '📅 Reservas'}
                  {tab === 'prices' && '💰 Preços'}
                  {tab === 'availability' && '📆 Disponibilidade'}
                  {tab === 'vouchers' && '🎟️ Vouchers'}
                  {tab === 'analytics' && '📈 Analíticas'}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Dashboard Overview */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">Receita (Junho)</h3>
                    <p className="text-3xl font-bold text-amber-600">€5,400</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">Ocupação</h3>
                    <p className="text-3xl font-bold text-green-600">45%</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">Visitantes (hoje)</h3>
                    <p className="text-3xl font-bold text-blue-600">280</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-amber-900 mb-2">Reservas Pendentes</h3>
                    <p className="text-3xl font-bold text-yellow-600">{reservations.filter(r => r.status === 'pending').length}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reservations */}
            {activeTab === 'reservations' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-amber-900 mb-6">Gestão de Reservas</h2>
                {loading ? (
                  <p className="text-gray-500">Carregando...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">Hóspede</th>
                          <th className="px-4 py-3 text-left font-semibold">Email</th>
                          <th className="px-4 py-3 text-left font-semibold">Datas</th>
                          <th className="px-4 py-3 text-left font-semibold">Status</th>
                          <th className="px-4 py-3 text-left font-semibold">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {reservations.map((res) => (
                          <tr key={res.id}>
                            <td className="px-4 py-3">{res.guestName}</td>
                            <td className="px-4 py-3">{res.guestEmail}</td>
                            <td className="px-4 py-3">{new Date(res.startDate).toLocaleDateString('pt-PT')} - {new Date(res.endDate).toLocaleDateString('pt-PT')}</td>
                            <td className="px-4 py-3">
                              <span className={`px-3 py-1 rounded text-xs font-semibold ${
                                res.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                res.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>{res.status}</span>
                            </td>
                            <td className="px-4 py-3 space-x-2">
                              {res.status === 'pending' && (
                                <>
                                  <button onClick={() => handleUpdateStatus(res.id, 'confirmed')} className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700">Confirmar</button>
                                  <button onClick={() => handleUpdateStatus(res.id, 'cancelled')} className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700">Cancelar</button>
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

            {/* Prices */}
            {activeTab === 'prices' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-amber-900">Gestão de Preços</h2>
                  <button onClick={addPrice} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700">+ Adicionar Preço</button>
                </div>
                <div className="space-y-4">
                  {prices.map((price) => (
                    <div key={price.id} className="border rounded-lg p-4 space-y-3">
                      <input type="text" defaultValue={price.season} className="w-full px-3 py-2 border rounded" placeholder="Temporada" />
                      <input type="number" defaultValue={price.pricePerNight} className="w-full px-3 py-2 border rounded" placeholder="Preço/noite" />
                      <div className="grid grid-cols-2 gap-3">
                        <input type="date" defaultValue={price.startDate} className="px-3 py-2 border rounded" />
                        <input type="date" defaultValue={price.endDate} className="px-3 py-2 border rounded" />
                      </div>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Guardar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            {activeTab === 'availability' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-2xl font-bold text-amber-900 mb-6">🚫 Bloquear Datas de Reservas</h2>
                <p className="text-gray-600 mb-6">As datas bloqueadas não poderão ter novas reservas. Use isto para manutenção, limpeza ou períodos de encerramento.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Add New Block */}
                  <div className="border-2 border-dashed border-amber-300 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-amber-900 mb-4">+ Adicionar Novo Bloqueio</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de Início</label>
                        <input type="date" id="newBlockStart" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Data de Fim</label>
                        <input type="date" id="newBlockEnd" className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Motivo</label>
                        <input type="text" id="newBlockReason" placeholder="Ex: Manutenção, Limpeza..." className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
                      </div>
                      <button onClick={() => {
                        const startDate = (document.getElementById('newBlockStart') as HTMLInputElement).value;
                        const endDate = (document.getElementById('newBlockEnd') as HTMLInputElement).value;
                        const reason = (document.getElementById('newBlockReason') as HTMLInputElement).value;
                        
                        if (startDate && endDate && reason) {
                          const newBlock = {
                            id: Math.max(...availability.map(a => a.id), 0) + 1,
                            startDate,
                            endDate,
                            reason,
                            status: 'blocked'
                          };
                          setAvailability([...availability, newBlock]);
                          (document.getElementById('newBlockStart') as HTMLInputElement).value = '';
                          (document.getElementById('newBlockEnd') as HTMLInputElement).value = '';
                          (document.getElementById('newBlockReason') as HTMLInputElement).value = '';
                        }
                      }} className="w-full bg-amber-600 text-white font-bold py-2 rounded-lg hover:bg-amber-700 transition">
                        🔒 Bloquear Período
                      </button>
                    </div>
                  </div>

                  {/* Calendar View */}
                  <div className="border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📅 Períodos Bloqueados</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {availability.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Nenhuma data bloqueada</p>
                      ) : (
                        availability.map((block) => (
                          <div key={block.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-red-600 font-bold">🚫</span>
                                  <span className="font-semibold text-gray-900">{block.reason}</span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  📍 {new Date(block.startDate).toLocaleDateString('pt-PT')} → {new Date(block.endDate).toLocaleDateString('pt-PT')}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {Math.ceil((new Date(block.endDate).getTime() - new Date(block.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} dias bloqueados
                                </div>
                              </div>
                              <button 
                                onClick={() => setAvailability(availability.filter(a => a.id !== block.id))}
                                className="text-red-600 hover:text-red-800 text-lg"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Os períodos bloqueados aparecerão no site e os clientes não conseguirão fazer reservas nestas datas. O sistema valida automaticamente.
                  </p>
                </div>
              </div>
            )}

            {/* Vouchers */}
            {activeTab === 'vouchers' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-amber-900">Gestão de Vouchers</h2>
                  <button onClick={addVoucher} className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700">+ Novo Voucher</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Código</th>
                        <th className="px-4 py-3 text-left font-semibold">Desconto (%)</th>
                        <th className="px-4 py-3 text-left font-semibold">Validade</th>
                        <th className="px-4 py-3 text-left font-semibold">Utilizações</th>
                        <th className="px-4 py-3 text-left font-semibold">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {vouchers.map((voucher) => (
                        <tr key={voucher.id}>
                          <td className="px-4 py-3 font-mono">{voucher.code}</td>
                          <td className="px-4 py-3">{voucher.discount}%</td>
                          <td className="px-4 py-3">{new Date(voucher.expiry).toLocaleDateString('pt-PT')}</td>
                          <td className="px-4 py-3">{voucher.usage}</td>
                          <td className="px-4 py-3">
                            <button className="text-blue-600 hover:text-blue-800">Editar</button>
                            <button className="ml-3 text-red-600 hover:text-red-800">Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Analytics */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold text-amber-900 mb-4">Visitantes e Conversões (últimos 6 dias)</h3>
                  {analytics ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analytics.visitors}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="visitors" stroke="#b45309" name="Visitantes" />
                        <Line type="monotone" dataKey="bookings" stroke="#10b981" name="Reservas" />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-xl font-bold text-amber-900 mb-4">Receita Mensal</h3>
                  {analytics ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={analytics.revenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#b45309" name="Receita (€)" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-xl font-bold text-amber-900 mb-4">Taxa de Ocupação</h3>
                    {analytics ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie data={[
                            { name: 'Ocupado', value: analytics.occupancy.occupied },
                            { name: 'Disponível', value: analytics.occupancy.available }
                          ]} cx="50%" cy="50%" labelLine={false} label>
                            {[0, 1].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>

                  <div className="bg-white rounded-lg shadow p-6 space-y-4">
                    <h3 className="text-xl font-bold text-amber-900">KPIs Principais</h3>
                    {analytics ? (
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Média de visitas/dia</span>
                          <span className="font-bold">{Math.round(analytics.kpis.avgVisitorsPerDay)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taxa de conversão</span>
                          <span className="font-bold">{analytics.kpis.conversionRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Receita média/reserva</span>
                          <span className="font-bold">€{analytics.kpis.avgRevenuePerBooking}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duração média estadia</span>
                          <span className="font-bold">{analytics.kpis.avgStayDuration} noites</span>
                        </div>
                      </div>
                    ) : null}
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