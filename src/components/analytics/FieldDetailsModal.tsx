import React from 'react';
import { X, MapPin, Maximize2, Leaf } from 'lucide-react';

interface Field {
  id: number | string;
  name: string;
  ubication?: string;
  capacity: string | number;
  animal_count?: number;
  state?: string;
  area?: string;
  food_types?: {
    name?: string;
  };
}

interface FieldDetailsModalProps {
  field: Field | null;
  isOpen: boolean;
  onClose: () => void;
}

export const FieldDetailsModal: React.FC<FieldDetailsModalProps> = ({
  field,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !field) return null;

  const capacity = parseInt(String(field.capacity)) || 0;
  const occupied = field.animal_count || 0;
  const occupationRate = capacity > 0 ? (occupied / capacity) * 100 : 0;

  // Determinar color según ocupación
  const getStatusColor = () => {
    if (occupationRate > 100) return 'bg-red-500 text-white';
    if (occupationRate > 80) return 'bg-yellow-500 text-white';
    if (occupationRate > 50) return 'bg-green-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const getProgressColor = () => {
    if (occupationRate > 100) return 'bg-red-600';
    if (occupationRate > 80) return 'bg-yellow-500';
    if (occupationRate > 50) return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <>
      {/* Backdrop con blur */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full pointer-events-auto
                   transform transition-all duration-300 scale-100 opacity-100
                   max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`${getStatusColor()} px-6 py-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Maximize2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{field.name}</h2>
                {field.ubication && (
                  <div className="flex items-center gap-1 text-white/90 text-sm mt-1">
                    <MapPin className="h-4 w-4" />
                    {field.ubication}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 rounded-full bg-white/20 hover:bg-white/30
                       flex items-center justify-center transition-colors
                       focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Cerrar"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Estado */}
            {field.state && (
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-600 block mb-2">
                  Estado Actual
                </label>
                <span
                  className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                    field.state === 'Disponible'
                      ? 'bg-green-100 text-green-800'
                      : field.state === 'Ocupado'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {field.state}
                </span>
              </div>
            )}

            {/* Ocupación */}
            <div className="mb-6">
              <label className="text-sm font-medium text-gray-600 block mb-3">
                Ocupación del Potrero
              </label>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600">Animales Actuales</span>
                  <span className="text-3xl font-bold text-gray-900">
                    {occupied}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-600">Capacidad Máxima</span>
                  <span className="text-3xl font-bold text-gray-900">
                    {capacity}
                  </span>
                </div>

                {/* Barra de progreso grande */}
                <div className="relative">
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-6 rounded-full transition-all duration-500 ${getProgressColor()}
                               flex items-center justify-end pr-2`}
                      style={{ width: `${Math.min(occupationRate, 100)}%` }}
                    >
                      <span className="text-xs font-bold text-white">
                        {occupationRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Alertas */}
                {occupationRate > 100 && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">
                      ⚠️ Atención: Potrero sobrecargado en{' '}
                      <span className="font-bold">
                        {(occupationRate - 100).toFixed(0)}%
                      </span>
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Se recomienda redistribuir animales a otros potreros
                    </p>
                  </div>
                )}

                {occupationRate > 80 && occupationRate <= 100 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-medium">
                      ⚡ Potrero cerca de su capacidad máxima
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Quedan {capacity - occupied} espacios disponibles
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Información adicional */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {field.area && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Maximize2 className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Área</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{field.area}</p>
                </div>
              )}
              {field.food_types?.name && (
                <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Leaf className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Tipo de Alimento
                    </span>
                  </div>
                  <p className="text-lg font-bold text-green-900">
                    {field.food_types.name}
                  </p>
                </div>
              )}
            </div>

            {/* Estadísticas */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Estadísticas
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{occupied}</p>
                  <p className="text-xs text-gray-600 mt-1">Ocupados</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {capacity - occupied}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Disponibles</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {occupationRate.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Ocupación</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700
                       hover:bg-gray-100 transition-colors font-medium
                       focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              Cerrar
            </button>
            <button
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white
                       hover:bg-blue-700 transition-colors font-medium
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Editar Potrero
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FieldDetailsModal;
