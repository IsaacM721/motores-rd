import Link from 'next/link';
import { ArrowRight, Shield, Clock, MapPin, Star } from 'lucide-react';

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center bg-black text-white overflow-hidden">
        {/* Background Image Placeholder */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-black/70" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `url('/hero-motorcycle.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        <div className="container-app relative z-10">
          <div className="max-w-3xl">
            <span className="inline-block px-4 py-2 bg-orange-500/20 text-orange-400 rounded-full text-sm font-semibold mb-6">
              Alquiler de Motos en RD
            </span>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Tu próxima
              <span className="text-orange-500"> aventura</span>
              <br />
              comienza aquí
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-xl">
              Explora República Dominicana sobre dos ruedas. Alquila la moto perfecta
              para tu viaje con los mejores dealers del país.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/motorcycles" className="btn-primary inline-flex items-center justify-center gap-2 text-lg">
                Explorar Motos
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/rent" className="btn-outline border-white text-white hover:bg-white hover:text-black inline-flex items-center justify-center text-lg">
                Cómo Funciona
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-50 to-transparent" />
      </section>

      {/* Features Section */}
      <section className="section bg-gray-50">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              ¿Por qué <span className="text-orange-500">MotoresRD</span>?
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              La forma más fácil y segura de alquilar una motocicleta en República Dominicana
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card p-6 text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Shield className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">100% Seguro</h3>
              <p className="text-gray-600">
                Todas las motos están verificadas y aseguradas para tu tranquilidad
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Clock className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Reserva Rápida</h3>
              <p className="text-gray-600">
                Encuentra y reserva tu moto en menos de 5 minutos
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Cobertura Nacional</h3>
              <p className="text-gray-600">
                Dealers en las principales ciudades de República Dominicana
              </p>
            </div>

            <div className="card p-6 text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">Top Calidad</h3>
              <p className="text-gray-600">
                Solo las mejores motos de las marcas más reconocidas
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Motorcycles Section */}
      <section className="section">
        <div className="container-app">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-2">
                Motos <span className="text-orange-500">Destacadas</span>
              </h2>
              <p className="text-gray-600">Las más populares entre nuestros usuarios</p>
            </div>
            <Link
              href="/motorcycles"
              className="hidden md:flex items-center gap-2 text-orange-500 font-semibold hover:gap-3 transition-all"
            >
              Ver todas
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>

          {/* Placeholder for motorcycle grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-gray-200" />
                <div className="p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-6 bg-gray-200 rounded w-2/3 mb-3" />
                  <div className="flex gap-4 mb-3">
                    <div className="h-4 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                  <div className="flex justify-between pt-3 border-t border-gray-100">
                    <div className="h-8 bg-gray-200 rounded w-24" />
                    <div className="h-10 bg-gray-200 rounded w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link href="/motorcycles" className="btn-outline inline-flex items-center gap-2">
              Ver todas las motos
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-black text-white">
        <div className="container-app text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            ¿Tienes motos para alquilar?
          </h2>
          <p className="text-gray-400 text-lg mb-8 max-w-2xl mx-auto">
            Únete a nuestra red de dealers y llega a miles de clientes potenciales.
            Gestiona tus reservas fácilmente desde tu panel de control.
          </p>
          <Link href="/register?role=dealer" className="btn-primary inline-flex items-center gap-2 text-lg">
            Registrar como Dealer
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="section">
        <div className="container-app">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Cómo <span className="text-orange-500">Funciona</span>
            </h2>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto">
              Alquilar una moto nunca fue tan fácil. En 3 simples pasos estarás listo para rodar.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-bold mb-2">Busca tu Moto</h3>
              <p className="text-gray-600">
                Explora nuestra amplia selección de motocicletas y filtra por categoría, precio y ubicación.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-bold mb-2">Reserva Online</h3>
              <p className="text-gray-600">
                Selecciona tus fechas, completa tu información y confirma tu reserva al instante.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-bold mb-2">¡A Rodar!</h3>
              <p className="text-gray-600">
                Recoge tu moto en el punto acordado y disfruta de tu aventura sobre dos ruedas.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link href="/motorcycles" className="btn-primary inline-flex items-center gap-2 text-lg">
              Comenzar Ahora
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
