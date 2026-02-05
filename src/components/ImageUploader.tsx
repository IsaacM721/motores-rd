'use client';

import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import Image from 'next/image';
import { Upload, X, Star, StarOff, Loader2 } from 'lucide-react';
import { MotorcycleImage } from '@/types';

interface ImageUploaderProps {
  images: MotorcycleImage[];
  onImagesChange: (images: MotorcycleImage[]) => void;
  onUpload: (file: File, color: string) => Promise<MotorcycleImage>;
  onDelete?: (imageUrl: string) => Promise<void>;
  maxImages?: number;
  className?: string;
}

export function ImageUploader({
  images,
  onImagesChange,
  onUpload,
  onDelete,
  maxImages = 10,
  className = '',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [color, setColor] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!color.trim()) {
      alert('Por favor ingresa el color antes de subir imágenes');
      return;
    }
    if (images.length >= maxImages) {
      alert(`Máximo ${maxImages} imágenes permitidas`);
      return;
    }

    setUploading(true);

    try {
      const newImages: MotorcycleImage[] = [];

      for (const file of Array.from(files)) {
        if (images.length + newImages.length >= maxImages) break;

        // Validate file type
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          continue;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          console.warn(`File too large: ${file.name}`);
          continue;
        }

        const uploadedImage = await onUpload(file, color);
        newImages.push(uploadedImage);
      }

      // Set first image as primary if no primary exists
      const allImages = [...images, ...newImages];
      if (!allImages.some((img) => img.isPrimary) && allImages.length > 0) {
        allImages[0].isPrimary = true;
      }

      onImagesChange(allImages);
      setColor('');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Error al subir imágenes');
    }

    setUploading(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDelete = async (index: number) => {
    const imageToDelete = images[index];

    if (onDelete) {
      try {
        await onDelete(imageToDelete.url);
      } catch (error) {
        console.error('Delete failed:', error);
      }
    }

    const newImages = images.filter((_, i) => i !== index);

    // Reassign primary if needed
    if (imageToDelete.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }

    onImagesChange(newImages);
  };

  const handleSetPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onImagesChange(newImages);
  };

  return (
    <div className={className}>
      {/* Color input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color de las imágenes
        </label>
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          placeholder="Ej: Rojo Metalizado, Negro Mate..."
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
        />
      </div>

      {/* Upload area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
          dragOver
            ? 'border-orange-500 bg-orange-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleInputChange}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            <p className="text-sm text-gray-600">Subiendo...</p>
          </div>
        ) : (
          <div
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              Arrastra imágenes aquí o{' '}
              <span className="text-orange-500 font-medium">haz clic para seleccionar</span>
            </p>
            <p className="text-xs text-gray-400">
              Máximo {maxImages} imágenes, 5MB cada una
            </p>
          </div>
        )}
      </div>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.url}
              className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100"
            >
              <Image
                src={image.url}
                alt={image.color}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 25vw"
              />

              {/* Primary badge */}
              {image.isPrimary && (
                <div className="absolute top-2 left-2 px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded">
                  Principal
                </div>
              )}

              {/* Color label */}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs py-1 px-2">
                {image.color}
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleSetPrimary(index)}
                  className="p-1.5 bg-white rounded-full shadow hover:bg-gray-100"
                  title={image.isPrimary ? 'Imagen principal' : 'Establecer como principal'}
                >
                  {image.isPrimary ? (
                    <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                  ) : (
                    <StarOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => handleDelete(index)}
                  className="p-1.5 bg-white rounded-full shadow hover:bg-red-50"
                  title="Eliminar"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
