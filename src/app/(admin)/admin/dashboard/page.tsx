'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bike, Users, Calendar, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface DashboardStats {
  totalMotorcycles: number;
  activeBookings: number;
  totalUsers: number;
  monthlyRevenue: number;
  motorcyclesTrend: number;
  bookingsTrend: number;
  usersTrend: number;
  revenueTrend: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalMotorcycles: 0,
    activeBookings: 0,
    totalUsers: 0,
    monthlyRevenue: 0,
    motorcyclesTrend: 0,
    bookingsTrend: 0,
    usersTrend: 0,
    revenueTrend: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data - replace with actual Firestore queries
    setStats({
      totalMotorcycles: 45,
      activeBookings: 12,
      totalUsers: 234,
      monthlyRevenue: 125000,
      motorcyclesTrend: 8,
      bookingsTrend: 15,
      usersTrend: 12,
      revenueTrend: -3,
    });
    setLoading(false);
  }, []);

  const statCards = [
    {
      label: 'Total Motocicletas',
      value: stats.totalMotorcycles,
      trend: stats.motorcyclesTrend,
      icon: Bike,
      href: '/admin/motorcycles',
      color: 'orange',
    },
    {
      label: 'Reservas Activas',
      value: stats.activeBookings,
      trend: stats.bookingsTrend,
      icon: Calendar,
      href: '/admin/bookings',
      color: 'blue',
    },
    {
      label: 'Usuarios Registrados',
      value: stats.totalUsers,
      trend: stats.usersTrend,
      icon: Users,
      href: '/admin/users',
      color: 'green',
    },
    {
      label: 'Ingresos del Mes',
      value: `RD$${stats.monthlyRevenue.toLocaleString()}`,
      trend: stats.revenueTrend,
      icon: TrendingUp,
      href: '/admin/bookings',
      color: 'purple',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Bienvenido al panel de administración de MotoresRD</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.trend >= 0;
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    stat.color === 'orange'
                      ? 'bg-orange-100'
                      : stat.color === 'blue'
                      ? 'bg-blue-100'
                      : stat.color === 'green'
                      ? 'bg-green-100'
                      : 'bg-purple-100'
                  }`}
                >
                  <Icon
                    className={`w-6 h-6 ${
                      stat.color === 'orange'
                        ? 'text-orange-500'
                        : stat.color === 'blue'
                        ? 'text-blue-500'
                        : stat.color === 'green'
                        ? 'text-green-500'
                        : 'text-purple-500'
                    }`}
                  />
                </div>
                <div
                  className={`flex items-center text-sm font-medium ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(stat.trend)}%
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : stat.value}
              </p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Actividad Reciente</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      Nueva reserva #100{i}
                    </p>
                    <p className="text-xs text-gray-500">
                      Honda CBR500R - {i} hora{i > 1 ? 's' : ''} atrás
                    </p>
                  </div>
                  <span className="badge badge-success">Confirmada</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Acciones Rápidas</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/admin/motorcycles/new"
                className="p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-colors text-center"
              >
                <Bike className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-700">Añadir Moto</p>
              </Link>
              <Link
                href="/admin/makes/new"
                className="p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-colors text-center"
              >
                <Bike className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-700">Añadir Make</p>
              </Link>
              <Link
                href="/admin/users"
                className="p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-colors text-center"
              >
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-700">Ver Usuarios</p>
              </Link>
              <Link
                href="/admin/bookings"
                className="p-4 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-colors text-center"
              >
                <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="font-medium text-gray-700">Ver Reservas</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
