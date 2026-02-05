'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Motorcycle } from '@/types';
import { formatPrice } from '@/lib/parsers';
import { Fuel, Gauge, Zap } from 'lucide-react';

interface MotorcycleCardProps {
  motorcycle: Motorcycle;
  showPrice?: boolean;
  className?: string;
}

export function MotorcycleCard({
  motorcycle,
  showPrice = true,
  className = '',
}: MotorcycleCardProps) {
  const primaryImage = motorcycle.images.find((img) => img.isPrimary) || motorcycle.images[0];
  const imageUrl = primaryImage?.url || '/placeholder-motorcycle.jpg';

  return (
    <Link
      href={`/motorcycle/${motorcycle.slug}`}
      className={`group block bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden ${className}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        <Image
          src={imageUrl}
          alt={`${motorcycle.make} ${motorcycle.model}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Category Badge */}
        <div className="absolute top-3 left-3">
          <span className="px-3 py-1 bg-black/80 text-white text-xs font-semibold rounded-full">
            {motorcycle.category}
          </span>
        </div>

        {/* Highlighted Badge */}
        {motorcycle.isHighlighted && (
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-full">
              Destacado
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <div className="mb-2">
          <p className="text-sm text-gray-500 font-medium">{motorcycle.make}</p>
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-500 transition-colors">
            {motorcycle.model}
          </h3>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
          {motorcycle.engineCC && (
            <div className="flex items-center gap-1">
              <Gauge className="w-4 h-4" />
              <span>{motorcycle.engineCC} cc</span>
            </div>
          )}
          {motorcycle.powerHP && (
            <div className="flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>{motorcycle.powerHP} HP</span>
            </div>
          )}
          {motorcycle.fuelCapacityLiters && (
            <div className="flex items-center gap-1">
              <Fuel className="w-4 h-4" />
              <span>{motorcycle.fuelCapacityLiters}L</span>
            </div>
          )}
        </div>

        {/* Price */}
        {showPrice && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-500">Desde</p>
              <p className="text-xl font-bold text-orange-500">
                {formatPrice(motorcycle.dailyPrice)}
                <span className="text-sm font-normal text-gray-500">/día</span>
              </p>
            </div>
            <button className="px-4 py-2 bg-black text-white text-sm font-semibold rounded-lg hover:bg-orange-500 transition-colors">
              Ver más
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}

export function MotorcycleCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden animate-pulse">
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
  );
}
