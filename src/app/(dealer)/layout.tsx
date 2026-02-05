'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bike,
  LayoutDashboard,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  CalendarClock,
} from 'lucide-react';
import { useAuth, useIsDealerOrAdmin } from '@/components';

const dealerNavItems = [
  { href: '/dealer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dealer/motorcycles', label: 'Mis Motos', icon: Bike },
  { href: '/dealer/bookings', label: 'Reservas', icon: Calendar },
  { href: '/dealer/availability', label: 'Disponibilidad', icon: CalendarClock },
  { href: '/dealer/settings', label: 'Configuración', icon: Settings },
];

export default function DealerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isDealerOrAdmin = useIsDealerOrAdmin();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user || !isDealerOrAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Acceso Denegado</h1>
          <p className="text-gray-600 mb-4">Necesitas ser dealer para acceder a esta sección.</p>
          <Link href="/login" className="btn-primary">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b p-4 flex items-center justify-between">
        <Link href="/dealer/dashboard" className="flex items-center gap-2">
          <Bike className="w-6 h-6 text-orange-500" />
          <span className="font-bold">Dealer Panel</span>
        </Link>
        <button onClick={() => setSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-white border-r">
          {/* Logo */}
          <div className="p-6 border-b">
            <Link href="/dealer/dashboard" className="flex items-center gap-2">
              <Bike className="w-8 h-8 text-orange-500" />
              <span className="text-xl font-bold">Dealer Panel</span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4">
            <ul className="space-y-1">
              {dealerNavItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-orange-50 text-orange-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* User */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-semibold">
                {user?.displayName?.[0] || 'D'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user?.businessName || user?.displayName}</p>
                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors w-full"
            >
              <LogOut className="w-5 h-5" />
              Cerrar Sesión
            </button>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-64 bg-white flex flex-col">
              <div className="p-4 flex items-center justify-between border-b">
                <span className="font-bold">Dealer Panel</span>
                <button onClick={() => setSidebarOpen(false)}>
                  <X className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex-1 p-4">
                <ul className="space-y-1">
                  {dealerNavItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                            isActive
                              ? 'bg-orange-50 text-orange-600 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              <div className="p-4 border-t">
                <button
                  onClick={signOut}
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="w-5 h-5" />
                  Cerrar Sesión
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
