'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { AdminTable } from '@/components';
import { Motorcycle } from '@/types';
import { formatPrice } from '@/lib/parsers';

export default function AdminMotorcyclesPage() {
  const [motorcycles, setMotorcycles] = useState<Motorcycle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load motorcycles - replace with actual Firestore query
    setLoading(false);
  }, []);

  const columns = [
    {
      key: 'image',
      header: 'Imagen',
      render: (moto: Motorcycle) => (
        <div className="w-16 h-12 rounded bg-gray-100 overflow-hidden">
          {moto.images[0] ? (
            <img
              src={moto.images[0].url}
              alt={moto.model}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              Sin imagen
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'make',
      header: 'Marca',
      sortable: true,
    },
    {
      key: 'model',
      header: 'Modelo',
      sortable: true,
    },
    {
      key: 'category',
      header: 'Categoría',
      sortable: true,
      render: (moto: Motorcycle) => (
        <span className="badge badge-primary">{moto.category}</span>
      ),
    },
    {
      key: 'engineCC',
      header: 'Motor',
      sortable: true,
      render: (moto: Motorcycle) => (
        <span>{moto.engineCC ? `${moto.engineCC} cc` : '-'}</span>
      ),
    },
    {
      key: 'dailyPrice',
      header: 'Precio/Día',
      sortable: true,
      render: (moto: Motorcycle) => (
        <span className="font-semibold">{formatPrice(moto.dailyPrice)}</span>
      ),
    },
    {
      key: 'available',
      header: 'Estado',
      render: (moto: Motorcycle) => (
        <span
          className={`badge ${
            moto.available ? 'badge-success' : 'badge-error'
          }`}
        >
          {moto.available ? 'Disponible' : 'No disponible'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      render: (moto: Motorcycle) => (
        <div className="flex items-center gap-2">
          <Link
            href={`/motorcycle/${moto.slug}`}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Ver"
          >
            <Eye className="w-4 h-4" />
          </Link>
          <Link
            href={`/admin/motorcycles/${moto.id}/edit`}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Editar"
          >
            <Edit className="w-4 h-4" />
          </Link>
          <button
            className="p-2 hover:bg-red-50 rounded-lg text-red-500"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Motocicletas</h1>
          <p className="text-gray-600 mt-1">
            Gestiona todas las motocicletas disponibles para alquiler
          </p>
        </div>
        <Link href="/admin/motorcycles/new" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nueva Moto
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por marca, modelo..."
              className="input pl-10"
            />
          </div>
          <select className="select w-auto">
            <option value="">Todas las categorías</option>
            <option value="Sport">Sport</option>
            <option value="Naked">Naked</option>
            <option value="Cruiser">Cruiser</option>
            <option value="Adventure">Adventure</option>
            <option value="Scooter">Scooter</option>
          </select>
          <select className="select w-auto">
            <option value="">Todos los estados</option>
            <option value="available">Disponible</option>
            <option value="unavailable">No disponible</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-500">Cargando motocicletas...</p>
        </div>
      ) : motorcycles.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No hay motocicletas
          </h3>
          <p className="text-gray-500 mb-6">
            Comienza agregando tu primera motocicleta al catálogo
          </p>
          <Link href="/admin/motorcycles/new" className="btn-primary inline-flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Añadir Primera Moto
          </Link>
        </div>
      ) : (
        <AdminTable
          data={motorcycles as unknown as Record<string, unknown>[]}
          columns={columns as never}
          keyField="id"
          searchFields={['make', 'model', 'category'] as never[]}
        />
      )}
    </div>
  );
}
