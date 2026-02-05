'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bike, Calendar, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { useAuth } from '@/components';
import { formatPrice } from '@/lib/parsers';

interface DealerStats {
  totalMotorcycles: number;
  availableMotorcycles: number;
  activeBookings: number;
  pendingBookings: number;
  monthlyRevenue: number;
  totalRevenue: number;
}

export default function DealerDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DealerStats>({
    totalMotorcycles: 0,
    availableMotorcycles: 0,
    activeBookings: 0,
    pendingBookings: 0,
    monthlyRevenue: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated data - replace with actual Firestore queries
    setStats({
      totalMotorcycles: 8,
      availableMotorcycles: 5,
      activeBookings: 3,
      pendingBookings: 2,
      monthlyRevenue: 45000,
      totalRevenue: 320000,
    });
    setLoading(false);
  }, []);

  return (
    <div>
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          ¡Hola, {user?.businessName || user?.displayName || 'Dealer'}!
        </h1>
        <p className="text-gray-600 mt-1">
          Aquí está el resumen de tu negocio
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Bike className="w-6 h-6 text-orange-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.totalMotorcycles}
          </p>
          <p className="text-sm text-gray-500">
            Total Motos ({stats.availableMotorcycles} disponibles)
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-500" />
            </div>
            {stats.pendingBookings > 0 && (
              <span className="badge badge-warning">{stats.pendingBookings} pendiente(s)</span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '...' : stats.activeBookings}
          </p>
          <p className="text-sm text-gray-500">Reservas Activas</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '...' : formatPrice(stats.monthlyRevenue)}
          </p>
          <p className="text-sm text-gray-500">Ingresos este mes</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-500" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '...' : formatPrice(stats.totalRevenue)}
          </p>
          <p className="text-sm text-gray-500">Ingresos Totales</p>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Reservas Recientes</h2>
            <Link href="/dealer/bookings" className="text-orange-500 text-sm font-medium hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="p-6">
            {stats.activeBookings === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay reservas activas</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">Honda CBR500R</p>
                      <p className="text-sm text-gray-500">
                        15 Feb - 18 Feb · Juan Pérez
                      </p>
                    </div>
                    <span className={`badge ${i === 1 ? 'badge-warning' : 'badge-success'}`}>
                      {i === 1 ? 'Pendiente' : 'Confirmada'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* My Motorcycles */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mis Motocicletas</h2>
            <Link href="/dealer/motorcycles" className="text-orange-500 text-sm font-medium hover:underline">
              Ver todas
            </Link>
          </div>
          <div className="p-6">
            {stats.totalMotorcycles === 0 ? (
              <div className="text-center py-8">
                <Bike className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No tienes motos registradas</p>
                <Link href="/dealer/motorcycles/new" className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Añadir Primera Moto
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="w-12 h-12 rounded-lg bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">Yamaha MT-07</p>
                      <p className="text-sm text-gray-500">
                        {formatPrice(2500)}/día
                      </p>
                    </div>
                    <span className={`badge ${i === 3 ? 'badge-error' : 'badge-success'}`}>
                      {i === 3 ? 'No disponible' : 'Disponible'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold mb-1">¿Quieres añadir más motos?</h3>
            <p className="text-orange-100">
              Aumenta tus ingresos agregando más motocicletas a tu flota.
            </p>
          </div>
          <Link
            href="/dealer/motorcycles/new"
            className="bg-white text-orange-500 px-6 py-3 rounded-lg font-semibold hover:bg-orange-50 transition-colors inline-flex items-center gap-2 justify-center"
          >
            <Plus className="w-5 h-5" />
            Añadir Moto
          </Link>
        </div>
      </div>
    </div>
  );
}
