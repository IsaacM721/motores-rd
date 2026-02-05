'use client';

import { useState, useEffect } from 'react';
import { MotorcycleCard, MotorcycleCardSkeleton } from '@/components';
import { getMotorcycles } from '@/services/motorcycles';
import { Motorcycle, MotorcycleCategory } from '@/types';
import { Filter, SlidersHorizontal, X } from 'lucide-react';

const CATEGORIES: MotorcycleCategory[] = [
  'Sport',
  'Naked',
  'Cruiser',
  'Adventure',
  'Touring',
  'Scooter',
  'Dual Sport',
  'Dirt Bike',
  'Classic',
  'Standard',
];

export default function MotorcyclesPage() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<MotorcycleCategory | ''>('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minEngine, setMinEngine] = useState('');
  const [maxEngine, setMaxEngine] = useState('');

  useEffect(() => {
    async function loadMotorcycles() {
      setLoading(true);
      try {
        const filters = {
          category: selectedCategory || undefined,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
          minEngineCC: minEngine ? parseInt(minEngine) : undefined,
          maxEngineCC: maxEngine ? parseInt(maxEngine) : undefined,
        };

        const { motorcycles: data } = await getMotorcycles(filters);
        setMotorcycles(data);
      } catch (error) {
        console.error('Failed to load motorcycles:', error);
      }
      setLoading(false);
    }

    loadMotorcycles();
  }, [selectedCategory, minPrice, maxPrice, minEngine, maxEngine]);

  const clearFilters = () => {
    setSelectedCategory('');
    setMinPrice('');
    setMaxPrice('');
    setMinEngine('');
    setMaxEngine('');
  };

  const hasActiveFilters = selectedCategory || minPrice || maxPrice || minEngine || maxEngine;

  return (
    <div className="min-h-screen">
      {/* Page Header */}
      <div className="page-header">
        <div className="container-app">
          <h1 className="page-title">Motocicletas</h1>
          <p className="text-gray-400 text-lg mt-2">
            Encuentra la moto perfecta para tu próxima aventura
          </p>
        </div>
      </div>

      <div className="container-app py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">Filtros</h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-orange-500 hover:underline"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Category Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as MotorcycleCategory | '')}
                  className="select"
                >
                  <option value="">Todas</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Precio por día (RD$)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    placeholder="Min"
                    className="input text-sm"
                  />
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    placeholder="Max"
                    className="input text-sm"
                  />
                </div>
              </div>

              {/* Engine Size */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cilindrada (cc)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={minEngine}
                    onChange={(e) => setMinEngine(e.target.value)}
                    placeholder="Min"
                    className="input text-sm"
                  />
                  <input
                    type="number"
                    value={maxEngine}
                    onChange={(e) => setMaxEngine(e.target.value)}
                    placeholder="Max"
                    className="input text-sm"
                  />
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden flex items-center justify-between mb-4">
            <p className="text-gray-600">
              {loading ? 'Cargando...' : `${motorcycles.length} motos encontradas`}
            </p>
            <button
              onClick={() => setFiltersOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </button>
          </div>

          {/* Mobile Filters Modal */}
          {filtersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setFiltersOpen(false)}
              />
              <div className="absolute inset-y-0 right-0 w-80 bg-white p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-lg">Filtros</h3>
                  <button onClick={() => setFiltersOpen(false)}>
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Same filters as desktop */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as MotorcycleCategory | '')}
                    className="select"
                  >
                    <option value="">Todas</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Precio por día (RD$)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      className="input text-sm"
                    />
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="input text-sm"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cilindrada (cc)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={minEngine}
                      onChange={(e) => setMinEngine(e.target.value)}
                      placeholder="Min"
                      className="input text-sm"
                    />
                    <input
                      type="number"
                      value={maxEngine}
                      onChange={(e) => setMaxEngine(e.target.value)}
                      placeholder="Max"
                      className="input text-sm"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={clearFilters}
                    className="btn-outline flex-1"
                  >
                    Limpiar
                  </button>
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="btn-primary flex-1"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Results Grid */}
          <div className="flex-1">
            {/* Results count - Desktop */}
            <div className="hidden lg:block mb-6">
              <p className="text-gray-600">
                {loading ? 'Cargando motos...' : `${motorcycles.length} motos encontradas`}
              </p>
            </div>

            {loading ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <MotorcycleCardSkeleton key={i} />
                ))}
              </div>
            ) : motorcycles.length === 0 ? (
              <div className="text-center py-16">
                <Filter className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  No se encontraron motos
                </h3>
                <p className="text-gray-500 mb-6">
                  Intenta ajustar los filtros para ver más resultados
                </p>
                <button onClick={clearFilters} className="btn-outline">
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {motorcycles.map((motorcycle) => (
                  <MotorcycleCard key={motorcycle.id} motorcycle={motorcycle} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
