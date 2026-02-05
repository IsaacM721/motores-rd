import { ReactNode } from 'react';
import Link from 'next/link';
import { Bike, User, Menu } from 'lucide-react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-app border-b border-gray-100">
        <div className="container-app">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <Bike className="w-8 h-8 text-orange-500" />
              <span className="text-2xl font-bold tracking-tight font-bebas">
                MOTORES<span className="text-orange-500">RD</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-8">
              <Link
                href="/motorcycles"
                className="text-gray-600 hover:text-black font-medium transition-colors"
              >
                Motocicletas
              </Link>
              <Link
                href="/rent"
                className="text-gray-600 hover:text-black font-medium transition-colors"
              >
                Cómo Funciona
              </Link>
              <Link
                href="/contact"
                className="text-gray-600 hover:text-black font-medium transition-colors"
              >
                Contacto
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-black font-medium transition-colors"
              >
                <User className="w-5 h-5" />
                <span>Iniciar Sesión</span>
              </Link>
              <Link href="/motorcycles" className="btn-primary hidden sm:block">
                Explorar Motos
              </Link>
              <button className="md:hidden p-2 hover:bg-gray-100 rounded-lg">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-black text-white">
        <div className="container-app py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2 mb-4">
                <Bike className="w-8 h-8 text-orange-500" />
                <span className="text-2xl font-bold tracking-tight font-bebas">
                  MOTORES<span className="text-orange-500">RD</span>
                </span>
              </Link>
              <p className="text-gray-400 text-sm">
                La plataforma líder de alquiler de motocicletas en República Dominicana.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Explora</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/motorcycles" className="hover:text-white transition-colors">
                    Todas las Motos
                  </Link>
                </li>
                <li>
                  <Link href="/motorcycles?category=Sport" className="hover:text-white transition-colors">
                    Motos Sport
                  </Link>
                </li>
                <li>
                  <Link href="/motorcycles?category=Adventure" className="hover:text-white transition-colors">
                    Motos Adventure
                  </Link>
                </li>
                <li>
                  <Link href="/motorcycles?category=Scooter" className="hover:text-white transition-colors">
                    Scooters
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Soporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/rent" className="hover:text-white transition-colors">
                    Cómo Funciona
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white transition-colors">
                    Preguntas Frecuentes
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Términos y Condiciones
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Para Dealers</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="/register?role=dealer" className="hover:text-white transition-colors">
                    Registrar como Dealer
                  </Link>
                </li>
                <li>
                  <Link href="/dealer/dashboard" className="hover:text-white transition-colors">
                    Panel de Dealer
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} MotoresRD. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
