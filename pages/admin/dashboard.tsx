import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc, doc, setDoc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';

interface Admin {
  email: string;
}

interface Tab {
  id: string;
  label: string;
  icon: string;
}

interface SiteMode {
  presentationModeEnabled: boolean;
}

interface SiteStats {
  totalVisits: number;
  lastVisitAt?: string;
}

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<{ email: string } | null>(null);
  const [reservations, setReservations] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([
    { id: 1, season: 'Verão', pricePerNight: 120, startDate: '2026-06-01', endDate: '2026-08-31' },
    { id: 2, season: 'Inverno', pricePerNight: 80, startDate: '2026-11-01', endDate: '2027-02-28' },
  ]);
  const [availability, setAvailability] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [newPrice, setNewPrice] = useState({ season: '', description: '', pricePerNight: 0, startDate: '', endDate: '' });
  const [newAvailability, setNewAvailability] = useState({ startDate: '', endDate: '', reason: '', status: 'blocked' });
  const [newVoucher, setNewVoucher] = useState({ code: '', type: 'percentage', value: 0, expiryDate: '' });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [contactInfo, setContactInfo] = useState({
    location: 'Vila Ruiva, Cuba - Beja',
    email: 'info@enzoloft.com',
    phone: '+351 XXX XXX XXX',
    description: 'Retiro de charme no coração do Alentejo',
    mapsUrl: ''
  });
  const [siteMode, setSiteMode] = useState<SiteMode>({
    presentationModeEnabled: false,
  });
  const [siteStats, setSiteStats] = useState<SiteStats>({
    totalVisits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();

  const COLORS = useMemo(() => ['#b45309', '#f59e0b'], []);

  const fetchAllData = useCallback(async () => {
    try {
      // Carregar reservas do Firestore
      const reservationsSnapshot = await getDocs(collection(db, 'reservations'));
      const reservationsData = reservationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a: any, b: any) => {
          // Ordenar por data de criação (mais recente primeiro)
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
      setReservations(reservationsData);
      
      // Carregar preços do Firestore
      const pricesSnapshot = await getDocs(collection(db, 'prices'));
      const pricesData = pricesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrices(pricesData);
      
      // Carregar disponibilidade do Firestore
      const availabilitySnapshot = await getDocs(collection(db, 'availability'));
      const availabilityData = availabilitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailability(availabilityData);
      
      // Carregar vouchers do Firestore
      const vouchersSnapshot = await getDocs(collection(db, 'vouchers'));
      const vouchersData = vouchersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVouchers(vouchersData);
      
      // Carregar configurações de contacto
      const contactDoc = await getDoc(doc(db, 'settings', 'contactInfo'));
      if (contactDoc.exists()) {
        setContactInfo(contactDoc.data() as any);
      }

      const siteModeDoc = await getDoc(doc(db, 'settings', 'siteMode'));
      if (siteModeDoc.exists()) {
        setSiteMode(siteModeDoc.data() as SiteMode);
      }

      const siteStatsDoc = await getDoc(doc(db, 'settings', 'siteStats'));
      if (siteStatsDoc.exists()) {
        setSiteStats(siteStatsDoc.data() as SiteStats);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('adminToken');
      const email = localStorage.getItem('adminEmail');

      if (!token || !email) {
        setLoading(false);
        router.push('/admin/login');
        return;
      }

      setAdmin({ email });
      await fetchAllData();
      setLoading(false);
    };

    verifyAuth();
  }, [fetchAllData, router]);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminEmail');
    router.push('/admin/login');
  }, [router]);

  const updateReservationStatus = useCallback(async (idx: number, status: string) => {
    const updated = [...reservations];
    if (updated[idx]) {
      const reservation = updated[idx];
      const oldStatus = reservation.status;
      updated[idx].status = status;
      setReservations(updated);
      
      // Atualizar no Firestore
      try {
        const reservationId = reservation.id;
        await updateDoc(doc(db, 'reservations', reservationId), { status });
        
        // Enviar email de cancelamento se o status mudou para cancelled
        if (status === 'cancelled' && oldStatus !== 'cancelled') {
          try {
            await fetch('/api/send-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'reservation_cancelled',
                data: {
                  guestName: reservation.guestName,
                  guestEmail: reservation.guestEmail,
                  startDate: reservation.startDate,
                  endDate: reservation.endDate,
                  reason: 'Cancelada pelo administrador'
                }
              })
            });
          } catch (emailError) {
            console.error('Erro ao enviar email de cancelamento:', emailError);
          }
        }
      } catch (error) {
        console.error('Erro ao atualizar status:', error);
      }
    }
  }, [reservations]);

  // Calcular estatísticas reais baseadas nos dados do Firestore
  const stats = useMemo(() => {
    const totalRevenue = reservations
      .filter(r => r.status === 'confirmed')
      .reduce((sum, r) => sum + (parseFloat(r.totalPrice) || 0), 0);
    
    const pendingCount = reservations.filter(r => r.status === 'pending').length;
    const confirmedCount = reservations.filter(r => r.status === 'confirmed').length;
    const totalReservations = reservations.length;
    
    // Calcular dias ocupados no mês atual
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const occupiedDays = new Set();
    reservations
      .filter(r => r.status === 'confirmed')
      .forEach(r => {
        const start = new Date(r.startDate);
        const end = new Date(r.endDate);
        const current = new Date(start);
        
        while (current <= end) {
          if (current >= firstDay && current <= lastDay) {
            occupiedDays.add(current.getDate());
          }
          current.setDate(current.getDate() + 1);
        }
      });
    
    const occupancyRate = daysInMonth > 0 ? Math.round((occupiedDays.size / daysInMonth) * 100) : 0;
    
    return {
      totalRevenue,
      pendingCount,
      confirmedCount,
      totalReservations,
      occupancyRate,
      occupiedDays: occupiedDays.size,
      daysInMonth
    };
  }, [reservations]);

  const getReservationCreatedDate = useCallback((reservation: any) => {
    if (reservation?.createdAt?.toDate) return reservation.createdAt.toDate();
    if (reservation?.createdAt) return new Date(reservation.createdAt);
    if (reservation?.startDate) return new Date(reservation.startDate);
    return new Date(0);
  }, []);

  const dashboardData = useMemo(() => {
    // Agrupar pedidos e confirmações por dia (últimos 7 dias)
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });
    
    return last7Days.map(date => {
      const dayRequests = reservations.filter(r => {
        const created = getReservationCreatedDate(r);
        return created.toDateString() === date.toDateString();
      });

      const dayConfirmed = dayRequests.filter(r => r.status === 'confirmed');
      
      return {
        day: days[date.getDay()],
        requests: dayRequests.length,
        confirmed: dayConfirmed.length
      };
    });
  }, [getReservationCreatedDate, reservations]);

  const occupancyData = useMemo(() => [
    { name: 'Ocupado', value: stats.occupancyRate },
    { name: 'Disponível', value: 100 - stats.occupancyRate },
  ], [stats]);

  const analyticsData = useMemo(() => {
    // Agrupar pedidos e confirmações por semana do mês atual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const weeks = [];
    
    for (let i = 0; i < 5; i++) {
      const weekRequests = reservations.filter(r => {
        const created = getReservationCreatedDate(r);
        if (created.getMonth() !== currentMonth || created.getFullYear() !== currentYear) return false;
        const day = created.getDate();
        return day >= (i * 6 + 1) && day <= ((i + 1) * 6);
      });

      const weekConfirmed = weekRequests.filter(r => r.status === 'confirmed');
      
      weeks.push({
        day: `${i * 6 + 1}-${Math.min((i + 1) * 6, 30)}`,
        requests: weekRequests.length,
        confirmed: weekConfirmed.length
      });
    }
    
    return weeks;
  }, [getReservationCreatedDate, reservations]);

  const revenueData = useMemo(() => {
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho'];
    const now = new Date();
    
    return months.map((month, idx) => {
      const monthReservations = reservations.filter(r => {
        if (r.status !== 'confirmed') return false;
        const date = new Date(r.startDate);
        return date.getMonth() === idx;
      });
      
      const revenue = monthReservations.reduce((sum, r) => sum + (parseFloat(r.totalPrice) || 0), 0);
      return { month, revenue };
    });
  }, [reservations]);

  const analyticsSummary = useMemo(() => {
    const now = new Date();
    const last30DaysStart = new Date(now);
    last30DaysStart.setDate(now.getDate() - 29);

    const last30DaysRequests = reservations.filter((reservation) => {
      const created = getReservationCreatedDate(reservation);
      return created >= last30DaysStart && created <= now;
    }).length;

    const conversionRate = stats.totalReservations > 0
      ? (stats.confirmedCount / stats.totalReservations) * 100
      : 0;

    const averageRevenuePerConfirmed = stats.confirmedCount > 0
      ? stats.totalRevenue / stats.confirmedCount
      : 0;

    const confirmedReservations = reservations.filter(r => r.status === 'confirmed');
    const totalConfirmedNights = confirmedReservations.reduce((sum, reservation) => {
      const start = new Date(reservation.startDate);
      const end = new Date(reservation.endDate);
      const nights = Math.max(Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)), 0);
      return sum + nights;
    }, 0);

    const averageStay = confirmedReservations.length > 0
      ? totalConfirmedNights / confirmedReservations.length
      : 0;

    return {
      requestsPerDay: last30DaysRequests / 30,
      conversionRate,
      averageRevenuePerConfirmed,
      averageStay,
    };
  }, [getReservationCreatedDate, reservations, stats]);

  const tabs = useMemo<Tab[]>(() => [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'calendar', label: 'Calendário', icon: '🗓️' },
    { id: 'reservations', label: 'Reservas', icon: '📋' },
    { id: 'prices', label: 'Preços', icon: '💰' },
    { id: 'availability', label: 'Disponibilidade', icon: '📅' },
    { id: 'vouchers', label: 'Vouchers', icon: '🎁' },
    { id: 'analytics', label: 'Analíticas', icon: '📈' },
    { id: 'settings', label: 'Configurações', icon: '⚙️' },
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
    return (
      <>
        <Head>
          <title>Admin Dashboard | EnzoLoft</title>
          <meta name="robots" content="noindex, nofollow, noarchive" />
        </Head>

        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 shadow-2xl w-full max-w-md text-center">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-amber-600 mx-auto"></div>
                <p className="mt-4 text-gray-700 font-semibold">A validar sessão de administrador...</p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-gray-800">🔐 Login necessário</h2>
                <p className="text-gray-600 mt-3">Para ver os gráficos do dashboard, entra primeiro na área de administração.</p>
                <button
                  onClick={() => router.push('/admin/login')}
                  className="mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-all"
                >
                  Ir para Login
                </button>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Admin Dashboard | EnzoLoft</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 md:py-6 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold">🏢 Painel Admin</h1>
            <p className="text-purple-100 text-sm md:text-base">EnzoLoft Management</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-500 hover:bg-red-600 px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold transition-all text-sm md:text-base"
          >
            🚪 Sair
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 font-semibold mb-2">Receita Total</p>
                <p className="text-3xl font-bold">€{stats.totalRevenue.toFixed(2)}</p>
                <p className="text-blue-100 text-sm mt-2">{stats.confirmedCount} reservas confirmadas</p>
              </div>
              <span className="text-4xl">💰</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-green-100 font-semibold mb-2">Taxa Ocupação</p>
                <p className="text-3xl font-bold">{stats.occupancyRate}%</p>
                <p className="text-green-100 text-sm mt-2">{stats.occupiedDays} de {stats.daysInMonth} dias</p>
              </div>
              <span className="text-4xl">📊</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-orange-100 font-semibold mb-2">Total Reservas</p>
                <p className="text-3xl font-bold">{stats.totalReservations}</p>
                <p className="text-orange-100 text-sm mt-2">Todas as reservas</p>
              </div>
              <span className="text-4xl">👥</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-red-100 font-semibold mb-2">Pendentes</p>
                <p className="text-3xl font-bold">{stats.pendingCount}</p>
                <p className="text-red-100 text-sm mt-2">Reservas a confirmar</p>
              </div>
              <span className="text-4xl">⏳</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-purple-100 font-semibold mb-2">Visitas ao Site</p>
                <p className="text-3xl font-bold">{siteStats.totalVisits || 0}</p>
                <p className="text-purple-100 text-sm mt-2">Contador global</p>
              </div>
              <span className="text-4xl">👁️</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="flex border-b border-gray-200 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-1 md:gap-2 px-3 md:px-6 py-3 md:py-4 font-semibold transition-all whitespace-nowrap text-xs md:text-base ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white border-b-4 border-transparent'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-sm md:text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 md:p-8">
            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">📈 Visão Geral</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 md:p-6 rounded-lg border-2 border-amber-100">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Receita Mensal</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueData}>
                        <CartesianGrid stroke="#fed7aa" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#f59e0b" name="Receita (€)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 md:p-6 rounded-lg border-2 border-orange-100">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Taxa de Ocupação</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={occupancyData} cx="50%" cy="50%" labelLine={false} label={<CustomLabel />} outerRadius={80} fill="#8884d8" dataKey="value">
                          <Cell fill="#10b981" />
                          <Cell fill="#e5e7eb" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 md:p-6 rounded-lg border-2 border-blue-100">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Pedidos & Confirmações (últimos 7 dias)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={dashboardData}>
                        <CartesianGrid stroke="#e5e7eb" />
                        <XAxis dataKey="day" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} name="Pedidos" />
                        <Line type="monotone" dataKey="confirmed" stroke="#10b981" strokeWidth={2} name="Confirmadas" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-6 rounded-lg border-2 border-emerald-100">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Estado das Reservas</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={[
                          { status: 'Pendentes', total: stats.pendingCount },
                          { status: 'Confirmadas', total: stats.confirmedCount },
                          {
                            status: 'Canceladas',
                            total: Math.max(stats.totalReservations - stats.pendingCount - stats.confirmedCount, 0),
                          },
                        ]}
                      >
                        <CartesianGrid stroke="#d1fae5" />
                        <XAxis dataKey="status" fontSize={12} />
                        <YAxis fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#10b981" name="Reservas" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Calendar Tab */}
            {activeTab === 'calendar' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-800">🗓️ Calendário de Reservas</h2>
                  <div className="flex gap-2 justify-center md:justify-end">
                    <button
                      onClick={() => {
                        const newMonth = new Date(currentMonth);
                        newMonth.setMonth(newMonth.getMonth() - 1);
                        setCurrentMonth(newMonth);
                      }}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 md:px-4 py-2 rounded-lg font-semibold transition-all text-sm md:text-base"
                    >
                      ◀ <span className="hidden sm:inline">Anterior</span>
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date())}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 md:px-4 py-2 rounded-lg font-semibold transition-all text-sm md:text-base"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => {
                        const newMonth = new Date(currentMonth);
                        newMonth.setMonth(newMonth.getMonth() + 1);
                        setCurrentMonth(newMonth);
                      }}
                      className="bg-purple-500 hover:bg-purple-600 text-white px-3 md:px-4 py-2 rounded-lg font-semibold transition-all text-sm md:text-base"
                    >
                      <span className="hidden sm:inline">Próximo</span> ▶
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl border-2 border-purple-200 p-3 md:p-6">
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 text-center">
                    {currentMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}
                  </h3>
                  
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                      <div key={day} className="text-center font-bold text-gray-700 py-2 text-xs md:text-base">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.substring(0, 1)}</span>
                      </div>
                    ))}
                    
                    {(() => {
                      const year = currentMonth.getFullYear();
                      const month = currentMonth.getMonth();
                      const firstDay = new Date(year, month, 1).getDay();
                      const daysInMonth = new Date(year, month + 1, 0).getDate();
                      const days = [];
                      
                      // Empty cells before first day
                      for (let i = 0; i < firstDay; i++) {
                        days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
                      }
                      
                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        const date = new Date(year, month, day);
                        const dateStr = date.toISOString().split('T')[0];
                        
                        // Find reservations for this day
                        const dayReservations = reservations.filter(res => {
                          if (res.status !== 'confirmed') return false;
                          const start = new Date(res.startDate);
                          const end = new Date(res.endDate);
                          return date >= start && date <= end;
                        });
                        
                        const isToday = new Date().toDateString() === date.toDateString();
                        
                        days.push(
                          <div
                            key={day}
                            className={`aspect-square border-2 rounded-lg p-0.5 md:p-1 cursor-pointer transition-all ${
                              isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            } ${
                              dayReservations.length > 0 ? 'bg-green-100 hover:bg-green-200' : 'hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              if (dayReservations.length > 0) {
                                setSelectedReservation(dayReservations[0]);
                              }
                            }}
                          >
                            <div className="text-xs md:text-sm font-semibold text-gray-700">{day}</div>
                            {dayReservations.length > 0 && (
                              <div className="mt-0.5 md:mt-1">
                                <div className="text-[0.6rem] md:text-xs font-semibold text-green-800 truncate">
                                  <span className="hidden md:inline">{dayReservations[0].guestName}</span>
                                  <span className="md:hidden">●</span>
                                </div>
                                {dayReservations.length > 1 && (
                                  <div className="text-[0.6rem] md:text-xs text-gray-600">+{dayReservations.length - 1}</div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return days;
                    })()}
                  </div>
                </div>

                {/* Reservation Details Modal */}
                {selectedReservation && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
                      <div className="flex justify-between items-start mb-6">
                        <h3 className="text-2xl font-bold text-gray-800">📋 Detalhes da Reserva</h3>
                        <button
                          onClick={() => setSelectedReservation(null)}
                          className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                          ✕
                        </button>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Nome do Hóspede</label>
                          <p className="text-lg text-gray-800">{selectedReservation.guestName}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Email</label>
                          <p className="text-lg text-gray-800">{selectedReservation.guestEmail}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Telefone</label>
                          <p className="text-lg text-gray-800">{selectedReservation.guestPhone || 'Não fornecido'}</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Check-in</label>
                            <p className="text-lg text-gray-800">
                              {new Date(selectedReservation.startDate).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-semibold text-gray-600">Check-out</label>
                            <p className="text-lg text-gray-800">
                              {new Date(selectedReservation.endDate).toLocaleDateString('pt-PT')}
                            </p>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Número de Hóspedes</label>
                          <p className="text-lg text-gray-800">👥 {selectedReservation.guestsCount}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Preço Total</label>
                          <p className="text-2xl font-bold text-green-600">€{selectedReservation.totalPrice}</p>
                        </div>
                        
                        <div>
                          <label className="text-sm font-semibold text-gray-600">Status</label>
                          <p>
                            <span className="px-4 py-2 rounded-full font-semibold text-sm bg-green-100 text-green-800">
                              ✓ Confirmada
                            </span>
                          </p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => setSelectedReservation(null)}
                        className="w-full mt-6 bg-purple-500 hover:bg-purple-600 text-white py-3 rounded-lg font-semibold transition-all"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Reservations Tab */}
            {activeTab === 'reservations' && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">📋 Reservas</h2>
                
                {/* Desktop Table */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-purple-200">
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Hóspede</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Email</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Datas</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Noites</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Hóspedes</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Preço</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Pedido em</th>
                        <th className="px-6 py-4 text-left font-semibold text-gray-700">Status</th>
                        <th className="px-6 py-4 text-center font-semibold text-gray-700">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservations.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
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
                            <td className="px-6 py-4 text-gray-900 font-semibold">
                              🌙 {Math.ceil((new Date(res.endDate).getTime() - new Date(res.startDate).getTime()) / (1000 * 60 * 60 * 24))}
                            </td>
                            <td className="px-6 py-4 text-gray-700">👥 {res.guestsCount}</td>
                            <td className="px-6 py-4 font-semibold text-blue-600">€{res.totalPrice}</td>
                            <td className="px-6 py-4 text-gray-600 text-xs">
                              {res.createdAt ? (
                                <>
                                  {new Date(res.createdAt.toDate ? res.createdAt.toDate() : res.createdAt).toLocaleDateString('pt-PT')}<br />
                                  <span className="text-gray-400">{new Date(res.createdAt.toDate ? res.createdAt.toDate() : res.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-block px-3 py-1.5 rounded-full font-semibold text-sm whitespace-nowrap ${
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

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-4">
                  {reservations.length === 0 ? (
                    <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
                      Nenhuma reserva ainda
                    </div>
                  ) : (
                    reservations.map((res, idx) => (
                      <div key={idx} className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 shadow-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{res.guestName}</h3>
                            <p className="text-gray-600 text-sm">{res.guestEmail}</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full font-semibold text-xs ${
                              res.status === 'confirmed'
                                ? 'bg-green-100 text-green-800'
                                : res.status === 'cancelled'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {res.status === 'confirmed' ? '✓' : res.status === 'cancelled' ? '✗' : '⏳'}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Datas:</span>
                            <span className="font-semibold text-gray-900">
                              {new Date(res.startDate).toLocaleDateString('pt-PT')} - {new Date(res.endDate).toLocaleDateString('pt-PT')}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Noites:</span>
                            <span className="font-semibold text-gray-900">🌙 {Math.ceil((new Date(res.endDate).getTime() - new Date(res.startDate).getTime()) / (1000 * 60 * 60 * 24))}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Hóspedes:</span>
                            <span className="font-semibold text-gray-900">👥 {res.guestsCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Preço:</span>
                            <span className="font-bold text-blue-600 text-lg">€{res.totalPrice}</span>
                          </div>
                          {res.createdAt && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Pedido em:</span>
                              <span className="text-gray-500 text-xs">
                                {new Date(res.createdAt.toDate ? res.createdAt.toDate() : res.createdAt).toLocaleDateString('pt-PT')} {new Date(res.createdAt.toDate ? res.createdAt.toDate() : res.createdAt).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateReservationStatus(idx, 'confirmed')}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          >
                            ✓ Confirmar
                          </button>
                          <button
                            onClick={() => updateReservationStatus(idx, 'cancelled')}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                          >
                            ✗ Cancelar
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Prices Tab */}
            {activeTab === 'prices' && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">💰 Preços</h2>
                <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>💡 Dica:</strong> Defina preços diferentes para períodos especiais como Verão, Natal, Páscoa, Fim de Semana, etc.
                  </p>
                </div>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      // Adicionar preço ao Firestore
                      const docRef = await addDoc(collection(db, 'prices'), newPrice);
                      const newPriceWithId = { ...newPrice, id: docRef.id };
                      const updatedPrices = [...prices, newPriceWithId];
                      setPrices(updatedPrices);
                      setNewPrice({ season: '', description: '', pricePerNight: 0, startDate: '', endDate: '' });
                    } catch (error) {
                      console.error('Erro ao adicionar preço:', error);
                      alert('Erro ao adicionar preço. Tente novamente.');
                    }
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
                          onClick={async () => {
                            try {
                              const priceToDelete = prices[idx];
                              await deleteDoc(doc(db, 'prices', priceToDelete.id));
                              const updatedPrices = prices.filter((_, i) => i !== idx);
                              setPrices(updatedPrices);
                            } catch (error) {
                              console.error('Erro ao remover preço:', error);
                              alert('Erro ao remover preço. Tente novamente.');
                            }
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
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newAvailability.startDate || !newAvailability.endDate) {
                      alert('Por favor, preencha as datas de início e fim.');
                      return;
                    }
                    try {
                      // Adicionar ao Firestore
                      const availabilityData = {
                        startDate: newAvailability.startDate,
                        endDate: newAvailability.endDate,
                        reason: newAvailability.reason || 'Bloqueado',
                        status: 'blocked',
                        createdAt: new Date().toISOString()
                      };
                      const docRef = await addDoc(collection(db, 'availability'), availabilityData);
                      const newAvailWithId = { ...availabilityData, id: docRef.id };
                      setAvailability([...availability, newAvailWithId]);
                      setNewAvailability({ startDate: '', endDate: '', reason: '', status: 'blocked' });
                    } catch (error) {
                      console.error('Erro ao bloquear datas:', error);
                      alert('Erro ao bloquear datas: ' + (error as Error).message);
                    }
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
                          onClick={async () => {
                            if (!confirm('Deseja mesmo remover este bloqueio?')) return;
                            try {
                              const availId = availability[idx].id;
                              if (!availId) {
                                alert('Erro: ID do bloqueio não encontrado.');
                                return;
                              }
                              await deleteDoc(doc(db, 'availability', availId));
                              setAvailability(availability.filter((_, i) => i !== idx));
                            } catch (error) {
                              console.error('Erro ao remover bloqueio:', error);
                              alert('Erro ao remover bloqueio: ' + (error as Error).message);
                            }
                          }}
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
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      const voucherData = {
                        code: newVoucher.code.trim().toUpperCase(),
                        type: newVoucher.type,
                        value: newVoucher.value,
                        expiryDate: newVoucher.expiryDate,
                        createdAt: new Date().toISOString()
                      };
                      const docRef = await addDoc(collection(db, 'vouchers'), voucherData);
                      const newVoucherWithId = { ...voucherData, id: docRef.id };
                      setVouchers([...vouchers, newVoucherWithId]);
                      setNewVoucher({ code: '', type: 'percentage', value: 0, expiryDate: '' });
                      alert('✅ Voucher criado com sucesso!');
                    } catch (error) {
                      console.error('Erro ao criar voucher:', error);
                      alert('Erro ao criar voucher: ' + (error as Error).message);
                    }
                  }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200 space-y-4"
                >
                  <h3 className="font-semibold text-gray-800 text-lg">Criar Novo Voucher</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input
                      type="text"
                      placeholder="Código"
                      value={newVoucher.code}
                      onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value.trim().toUpperCase() })}
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
                        onClick={async () => {
                          if (!confirm('Deseja mesmo remover este voucher?')) return;
                          try {
                            const voucherId = vouchers[idx].id;
                            if (!voucherId) {
                              alert('Erro: ID do voucher não encontrado.');
                              return;
                            }
                            await deleteDoc(doc(db, 'vouchers', voucherId));
                            setVouchers(vouchers.filter((_, i) => i !== idx));
                          } catch (error) {
                            console.error('Erro ao remover voucher:', error);
                            alert('Erro ao remover voucher: ' + (error as Error).message);
                          }
                        }}
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
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">📊 Analíticas</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 md:p-6 rounded-xl border-2 border-blue-200">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">📈 Pedidos & Confirmações (semanas do mês)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={analyticsData}>
                        <CartesianGrid stroke="#e0e7ff" />
                        <XAxis dataKey="day" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Line type="monotone" dataKey="requests" stroke="#3b82f6" strokeWidth={2} name="Pedidos" />
                        <Line type="monotone" dataKey="confirmed" stroke="#06b6d4" strokeWidth={2} name="Confirmadas" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-4 md:p-6 rounded-xl border-2 border-orange-200">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">💹 Receita Mensal</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueData}>
                        <CartesianGrid stroke="#fed7aa" />
                        <XAxis dataKey="month" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#f59e0b" name="Receita (€)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 md:p-6 rounded-xl border-2 border-blue-200">
                    <p className="text-blue-700 font-semibold mb-2 text-xs md:text-base">Pedidos/dia (30d)</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-900">{analyticsSummary.requestsPerDay.toFixed(1)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 md:p-6 rounded-xl border-2 border-green-200">
                    <p className="text-green-700 font-semibold mb-2 text-xs md:text-base">Taxa Confirmação</p>
                    <p className="text-2xl md:text-3xl font-bold text-green-900">{analyticsSummary.conversionRate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-3 md:p-6 rounded-xl border-2 border-purple-200">
                    <p className="text-purple-700 font-semibold mb-2 text-xs md:text-base">Média/Reserva</p>
                    <p className="text-2xl md:text-3xl font-bold text-purple-900">€{analyticsSummary.averageRevenuePerConfirmed.toFixed(2)}</p>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-3 md:p-6 rounded-xl border-2 border-yellow-200">
                    <p className="text-yellow-700 font-semibold mb-2 text-xs md:text-base">Duração Média</p>
                    <p className="text-2xl md:text-3xl font-bold text-yellow-900">{analyticsSummary.averageStay.toFixed(1)} dias</p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800">⚙️ Configurações do Site</h2>
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border-2 border-orange-200">
                  <h3 className="font-semibold text-gray-800 text-lg mb-4">Modo de Apresentação</h3>
                  <label className="flex items-center justify-between gap-4 cursor-pointer">
                    <div>
                      <p className="font-semibold text-gray-800">Ativar página sem reservas</p>
                      <p className="text-sm text-gray-600">
                        Quando ativo, o site público mostra apenas a apresentação e comodidades da casa.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={siteMode.presentationModeEnabled}
                      onChange={(e) =>
                        setSiteMode((prev) => ({
                          ...prev,
                          presentationModeEnabled: e.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-orange-600"
                    />
                  </label>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-xl border-2 border-purple-200">
                  <h3 className="font-semibold text-gray-800 text-lg mb-4">Informações do Footer</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">📍 Localização</label>
                      <input
                        type="text"
                        value={contactInfo.location}
                        onChange={(e) => setContactInfo({ ...contactInfo, location: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Vila Ruiva, Cuba - Beja"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">📧 Email</label>
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="info@enzoloft.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">📞 Telefone</label>
                      <input
                        type="tel"
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="+351 XXX XXX XXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Descrição</label>
                      <input
                        type="text"
                        value={contactInfo.description}
                        onChange={(e) => setContactInfo({ ...contactInfo, description: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Retiro de charme no coração do Alentejo"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">🗺️ Google Maps (URL de incorporação)</label>
                      <input
                        type="url"
                        value={contactInfo.mapsUrl}
                        onChange={(e) => setContactInfo({ ...contactInfo, mapsUrl: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="https://www.google.com/maps/embed?pb=..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        💡 Como obter: Google Maps → Partilhar → Incorporar um mapa → Copiar HTML (só o URL do src)
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          await Promise.all([
                            setDoc(doc(db, 'settings', 'contactInfo'), contactInfo),
                            setDoc(doc(db, 'settings', 'siteMode'), siteMode),
                          ]);
                          alert('✅ Configurações guardadas com sucesso!');
                        } catch (error) {
                          console.error('Erro ao guardar configurações:', error);
                          alert('❌ Erro ao guardar configurações. Tente novamente.');
                        }
                      }}
                      className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-lg font-bold hover:shadow-lg hover:shadow-purple-300 transition-all"
                    >
                      💾 Guardar Configurações
                    </button>
                  </div>
                </div>
                
                <div className="bg-blue-50 border-2 border-blue-200 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>ℹ️ Informação:</strong> Estas informações aparecerão no rodapé (footer) da página principal do site.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-600 mx-auto"></div>
            <p className="mt-4 text-gray-700 font-semibold">A carregar...</p>
          </div>
        </div>
      )}
      </div>
    </>
  );
}