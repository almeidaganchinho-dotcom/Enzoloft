import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/router';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Admin {
  email: string;
}

interface Tab {
  id: string;
  label: string;
  icon: string;
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<{ email: string } | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([
    { id: 1, season: 'Verão', pricePerNight: 120, startDate: '2026-06-01', endDate: '2026-08-31' },
    { id: 2, season: 'Inverno', pricePerNight: 80, startDate: '2026-11-01', endDate: '2027-02-28' },
  ]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([
    { id: 1, code: 'SUMMER20', type: 'percentage', value: 20, expiryDate: '2026-08-31' },
  ]);
  const [newPrice, setNewPrice] = useState({ season: '', description: '', pricePerNight: 0, startDate: '', endDate: '' });
  const [newAvailability, setNewAvailability] = useState({ startDate: '', endDate: '', reason: '', status: 'blocked' });
  const [newVoucher, setNewVoucher] = useState({ code: '', type: 'percentage', value: 0, expiryDate: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();

  const COLORS = useMemo(() => ['#b45309', '#f59e0b'], []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const email = localStorage.getItem('adminEmail');

    if (!token) {
      router.push('/admin/login');
      return;
    }

    setAdmin({ email: email || 'Admin' });
    
    // Carregar preços do localStorage
    const storedPrices = localStorage.getItem('prices');
    if (storedPrices) {
      setPrices(JSON.parse(storedPrices));
    }
    
    fetchAllData();
  }, []);

  const fetchAllData = useCallback(async () => {
    try {
      // Modo estático: carregar reservas do localStorage
      const storedReservations = JSON.parse(localStorage.getItem('reservations') || '[]');
      setReservations(storedReservations);
      setAvailability([]);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    router.push('/admin/login');
  }, [router]);

  const updateReservationStatus = useCallback((idx: number, status: string) => {
    const updated = [...reservations];
    if (updated[idx]) {
      updated[idx].status = status;
      setReservations(updated);
      // Atualizar no localStorage
      localStorage.setItem('reservations', JSON.stringify(updated));
    }
  }, [reservations]);

  const dashboardData = useMemo(() => [
    { day: 'Seg', visitors: 450, conversions: 65 },
    { day: 'Ter', visitors: 520, conversions: 78 },
    { day: 'Qua', visitors: 480, conversions: 72 },
    { day: 'Qui', visitors: 610, conversions: 92 },
    { day: 'Sex', visitors: 720, conversions: 120 },
    { day: 'Sab', visitors: 890, conversions: 156 },
  ], []);

  const occupancyData = useMemo(() => [
    { name: 'Ocupado', value: 78 },
    { name: 'Disponível', value: 22 },
  ], []);

  const analyticsData = useMemo(() => [
    { day: '1-6', visitors: 2400, conversions: 350 },
    { day: '7-12', visitors: 2800, conversions: 420 },
    { day: '13-18', visitors: 3200, conversions: 520 },
    { day: '19-24', visitors: 2900, conversions: 450 },
    { day: '25-30', visitors: 3500, conversions: 620 },
  ], []);

  const revenueData = useMemo(() => [
    { month: 'Janeiro', revenue: 4200 },
    { month: 'Fevereiro', revenue: 3800 },
    { month: 'Março', revenue: 5100 },
    { month: 'Abril', revenue: 6200 },
    { month: 'Maio', revenue: 7500 },
    { month: 'Junho', revenue: 8900 },
  ], []);

  const tabs = useMemo<Tab[]>(() => [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'reservations', label: 'Reservas', icon: '📋' },
    { id: 'prices', label: 'Preços', icon: '💰' },
    { id: 'availability', label: 'Disponibilidade', icon: '📅' },
    { id: 'vouchers', label: 'Vouchers', icon: '🎁' },
    { id: 'analytics', label: 'Analíticas', icon: '📈' },
  ], []);

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!admin) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800"></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-6 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">🏢 Painel Admin</h1>
            <p className="text-purple-100">EnzoLoft Management</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 px-6 py-3 rounded-lg font-semibold transition-all"
          >
            🚪 Sair
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 font-semibold mb-2">Receita Total</p>
                <p className="text-3xl font-bold">€15.420</p>
                <p className="text-blue-100 text-sm mt-2">↑ +12% este mês</p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-100 font-semibold mb-2">Taxa Ocupação</p>
                <p className="text-3xl font-bold">78%</p>
                <p className="text-green-100 text-sm mt-2">18 de 23 dias</p>
              </div>
              <span className="text-4xl">📊</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 font-semibold mb-2">Visitantes</p>
                <p className="text-3xl font-bold">2.847</p>
                <p className="text-orange-100 text-sm mt-2">↑ +24% esta semana</p>
              </div>
              <span className="text-4xl">👥</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-100 font-semibold mb-2">Pendentes</p>
                <p className="text-3xl font-bold">5</p>
                <p className="text-red-100 text-sm mt-2">Reservas a confirmar</p>
              </div>
              <span className="text-4xl">⏳</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-b-4 border-transparent'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">📈 Visão Geral</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Visitantes & Conversões (últimos 6 dias)</h3>
                    <LineChart width={400} height={300} data={dashboardData}>
                      <CartesianGrid stroke="#e5e7eb" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} />
                      <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} />
                    </LineChart>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-lg border-2 border-orange-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Taxa de Ocupação</h3>
                    <PieChart width={400} height={300}>
                      <Pie data={occupancyData} cx={200} cy={150} labelLine={false} label={<CustomLabel />} outerRadius={80} fill="#8884d8" dataKey="value">
                        <Cell fill="#10b981" />
                        <Cell fill="#e5e7eb" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </div>
                </div>
              </div>
            )}

            {/* Reservations Tab */}
            {activeTab === 'reservations' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">📋 Reservas</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-200">
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Hóspede</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Email</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Datas</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Hóspedes</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Preço</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                            Nenhuma reserva ainda
                          </td>
                        </tr>
                      ) : (
                        reservations.map((res, idx) => (
                          <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 font-semibold text-gray-900">{res.guestName}</td>
                            <td className="px-6 py-4 text-gray-700">{res.guestEmail}</td>
                            <td className="px-6 py-4 text-gray-700">
                              {new Date(res.startDate).toLocaleDateString('pt-PT')} -{' '}
                              {new Date(res.endDate).toLocaleDateString('pt-PT')}
                            </td>
                            <td className="px-6 py-4 text-gray-700">👥 {res.guestsCount}</td>
                            <td className="px-6 py-4 font-semibold text-blue-600">€{res.totalPrice}</td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-4 py-2 rounded-full font-semibold text-sm ${
                                  res.status === 'confirmed'
                                    ? 'bg-green-100 text-green-800'
                                    : res.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {res.status === 'confirmed' ? '✓ Confirmada' : res.status === 'cancelled' ? '✗ Cancelada' : '⏳ Pendente'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center space-x-2 flex justify-center">
                              <button
                                onClick={() => updateReservationStatus(idx, 'confirmed')}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => updateReservationStatus(idx, 'cancelled')}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                              >
                                ✗
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Prices Tab */}
            {activeTab === 'prices' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">💰 Preços</h2>
                <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Defina preços diferentes para períodos especiais como Verão, Natal, Páscoa, Fim de Semana, etc.
                  </p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const newPriceWithId = { ...newPrice, id: Date.now() };
                    const updatedPrices = [...prices, newPriceWithId];
                    setPrices(updatedPrices);
                    localStorage.setItem('prices', JSON.stringify(updatedPrices));
                    setNewPrice({ season: '', description: '', pricePerNight: 0, startDate: '', endDate: '' });
                  }}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200 space-y-4"
                >
                  <h3 className="font-semibold text-gray-800 text-lg">Adicionar Novo Período de Preço</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Nome do período (ex: Verão 2026, Natal, Páscoa)"
                      value={newPrice.season}
                      onChange={(e) => setNewPrice({ ...newPrice, season: e.target.value })}
                      className="px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Descrição (opcional: ex: Alta temporada, Feriado)"
                      value={newPrice.description}
                      onChange={(e) => setNewPrice({ ...newPrice, description: e.target.value })}
                      className="px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="number"
                      placeholder="Preço por noite (€)"
                      value={newPrice.pricePerNight || ''}
                      onChange={(e) => setNewPrice({ ...newPrice, pricePerNight: parseFloat(e.target.value) || 0 })}
                      className="px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      required
                    />
                    <input
                      type="date"
                      placeholder="Data início"
                      value={newPrice.startDate}
                      onChange={(e) => setNewPrice({ ...newPrice, startDate: e.target.value })}
                      className="px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="date"
                      placeholder="Data fim"
                      value={newPrice.endDate}
                      onChange={(e) => setNewPrice({ ...newPrice, endDate: e.target.value })}
                      className="px-4 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-green-300 transition-all"
                  >
                    ➕ Adicionar Período de Preço
                  </button>
                </form>
                <div className="space-y-3">
                  {prices.length === 0 ? (
                    <div className="bg-gray-50 border-2 border-gray-200 p-8 rounded-lg text-center">
                      <p className="text-gray-500">Nenhum período de preço definido. Adicione o primeiro!</p>
                    </div>
                  ) : (
                    prices.map((price, idx) => (
                      <div key={price.id || idx} className="bg-white border-2 border-green-200 p-4 rounded-lg flex justify-between items-center hover:shadow-md transition-all">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-800 text-lg">{price.season}</p>
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-bold">
                              €{price.pricePerNight}/noite
                            </span>
                          </div>
                          {price.description && (
                            <p className="text-sm text-gray-500 mt-1">📝 {price.description}</p>
                          )}
                          <p className="text-sm text-gray-600 mt-1">
                            📅 {new Date(price.startDate).toLocaleDateString('pt-PT')} até {new Date(price.endDate).toLocaleDateString('pt-PT')}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const updatedPrices = prices.filter((_, i) => i !== idx);
                            setPrices(updatedPrices);
                            localStorage.setItem('prices', JSON.stringify(updatedPrices));
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all ml-4"
                        >
                          🗑️ Remover
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === 'availability' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">📅 Disponibilidade</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setAvailability([...availability, newAvailability]);
                    setNewAvailability({ startDate: '', endDate: '', reason: '', status: 'blocked' });
                  }}
                  className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200 space-y-4"
                >
                  <h3 className="font-semibold text-gray-800 text-lg">Bloquear Datas</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="date"
                      value={newAvailability.startDate}
                      onChange={(e) => setNewAvailability({ ...newAvailability, startDate: e.target.value })}
                      className="px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="date"
                      value={newAvailability.endDate}
                      onChange={(e) => setNewAvailability({ ...newAvailability, endDate: e.target.value })}
                      className="px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Motivo (ex: Manutenção)"
                      value={newAvailability.reason}
                      onChange={(e) => setNewAvailability({ ...newAvailability, reason: e.target.value })}
                      className="px-4 py-3 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-orange-300 transition-all"
                  >
                    🔒 Bloquear Datas
                  </button>
                </form>
                <div className="space-y-3">
                  {availability.map((avail, idx) => {
                    const start = new Date(avail.startDate);
                    const end = new Date(avail.endDate);
                    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    return (
                      <div key={idx} className="bg-white border-2 border-orange-200 p-4 rounded-lg flex justify-between items-center hover:shadow-md transition-all">
                        <div>
                          <p className="font-semibold text-gray-800">🔒 {avail.reason || 'Bloqueado'}</p>
                          <p className="text-sm text-gray-600">
                            {avail.startDate} a {avail.endDate} • {days} dia(s)
                          </p>
                        </div>
                        <button
                          onClick={() => setAvailability(availability.filter((_, i) => i !== idx))}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                        >
                          🗑️
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Vouchers Tab */}
            {activeTab === 'vouchers' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">🎁 Vouchers</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setVouchers([...vouchers, newVoucher]);
                    setNewVoucher({ code: '', type: 'percentage', value: 0, expiryDate: '' });
                  }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200 space-y-4"
                >
                  <h3 className="font-semibold text-gray-800 text-lg">Criar Novo Voucher</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Código"
                      value={newVoucher.code}
                      onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value })}
                      className="px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                      required
                    />
                    <select
                      value={newVoucher.type}
                      onChange={(e) => setNewVoucher({ ...newVoucher, type: e.target.value as 'percentage' | 'fixed' })}
                      className="px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="percentage">Percentagem (%)</option>
                      <option value="fixed">Valor Fixo (€)</option>
                    </select>
                    <input
                      type="number"
                      placeholder="Valor"
                      value={newVoucher.value}
                      onChange={(e) => setNewVoucher({ ...newVoucher, value: parseFloat(e.target.value) })}
                      className="px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                    <input
                      type="date"
                      value={newVoucher.expiryDate}
                      onChange={(e) => setNewVoucher({ ...newVoucher, expiryDate: e.target.value })}
                      className="px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-300 transition-all"
                  >
                    ➕ Criar Voucher
                  </button>
                </form>
                <div className="space-y-3">
                  {vouchers.map((voucher, idx) => (
                    <div key={idx} className="bg-white border-2 border-purple-200 p-4 rounded-lg flex justify-between items-center hover:shadow-md transition-all">
                      <div>
                        <p className="font-semibold text-gray-800">🎫 {voucher.code}</p>
                        <p className="text-sm text-gray-600">
                          {voucher.type === 'percentage' ? `${voucher.value}%` : `€${voucher.value}`} desconto • Expira: {voucher.expiryDate}
                        </p>
                      </div>
                      <button
                        onClick={() => setVouchers(vouchers.filter((_, i) => i !== idx))}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800">📊 Analíticas</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border-2 border-blue-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">📈 Visitantes & Conversões (6 dias)</h3>
                    <LineChart width={450} height={300} data={analyticsData}>
                      <CartesianGrid stroke="#e0e7ff" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="visitors" stroke="#3b82f6" strokeWidth={2} name="Visitantes" />
                      <Line type="monotone" dataKey="conversions" stroke="#06b6d4" strokeWidth={2} name="Conversões" />
                    </LineChart>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">💹 Receita Mensal</h3>
                    <BarChart width={450} height={300} data={revenueData}>
                      <CartesianGrid stroke="#fed7aa" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="revenue" fill="#f59e0b" name="Receita (€)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                    <p className="text-blue-700 font-semibold mb-2">Visitantes/dia</p>
                    <p className="text-3xl font-bold text-blue-900">473</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
                    <p className="text-green-700 font-semibold mb-2">Taxa Conversão</p>
                    <p className="text-3xl font-bold text-green-900">16.8%</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
                    <p className="text-purple-700 font-semibold mb-2">Média/Reserva</p>
                    <p className="text-3xl font-bold text-purple-900">€420</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border-2 border-yellow-200">
                    <p className="text-yellow-700 font-semibold mb-2">Duração Média</p>
                    <p className="text-3xl font-bold text-yellow-900">3.2 dias</p>
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