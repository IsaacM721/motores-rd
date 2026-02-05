export type MotorcycleCategory =
  | 'Sport'
  | 'Naked'
  | 'Cruiser'
  | 'Adventure'
  | 'Touring'
  | 'Scooter'
  | 'Dual Sport'
  | 'Dirt Bike'
  | 'Classic'
  | 'Standard';

export type MarketPresence = 'Alta' | 'Media' | 'Baja';

export interface Motorcycle {
  id: string;
  makeId: string;
  make: string;
  model: string;
  slug: string;
  engineCC: number | null;
  powerHP: number | null;
  torqueNm: number | null;
  category: MotorcycleCategory;
  fuelCapacityLiters: number | null;
  cylinders: number | null;
  weight: number | null;
  seatHeight: string | null;
  topSpeed: string | null;
  availableColors: string[];
  images: MotorcycleImage[];
  dailyPrice: number;
  weeklyPrice: number;
  monthlyPrice: number | null;
  available: boolean;
  ownerId: string;
  yearFrom: number | null;
  yearTo: number | null;
  marketPresence: MarketPresence | null;
  importer: string | null;
  countryOrigin: string | null;
  canImport: boolean;
  keyFeatures: string | null;
  isHighlighted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MotorcycleImage {
  url: string;
  color: string;
  colorSlug: string;
  isPrimary: boolean;
}

export interface Make {
  id: string;
  brandId: string;
  name: string;
  slug: string;
  engineCC: number | null;
  category: MotorcycleCategory | null;
  yearFrom: number | null;
  yearTo: number | null;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  type: 'motorcycle' | 'car' | 'truck' | 'both';
}

export interface MotorcycleFilters {
  brand?: string;
  category?: MotorcycleCategory;
  minEngineCC?: number;
  maxEngineCC?: number;
  minPrice?: number;
  maxPrice?: number;
  availableFrom?: Date;
  availableTo?: Date;
}

export interface MotorcycleFormData {
  makeId: string;
  dailyPrice: number;
  weeklyPrice: number;
  monthlyPrice?: number;
  images: File[];
  available: boolean;
}
