import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, MapPin, Maximize2, Leaf, Users, Calendar, TrendingUp, AlertTriangle, Activity, Eye } from 'lucide-react';
import { animalService } from '@/services/animalService';

interface Field {
  id: number | string;
  name: string;
  ubication?: string;
  capacity: string | number;
  animal_count?: number;
  state?: string;
  area?: string;
  food_types?: {
    id?: number;
    name?: string;
  };
  created_at?: string;
  updated_at?: string;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'animals' | 'stats'>('overview');

  // Obtener animales del potrero
  const { data: animalsData, isLoading: animalsLoading } = useQuery({
    queryKey: ['field-animals', field?.id],
    queryFn: async () => {
      if (!field?.id) return null;
      const response = await animalService.getPaginated({
        limit: 100,
      });
      // Filtrar en frontend los animales que están en este potrero
      const allAnimals = response.data || [];
      return allAnimals.filter((animal: any) =>
        animal.field_id === field.id ||
        animal.field?.id === field.id ||
        animal.id_field === field.id
      );
    },
    enabled: isOpen && !!field?.id && activeTab === 'animals',
  });

  if (!isOpen || !field) return null;

  const capacity = parseInt(String(field.capacity)) || 0;
  const occupied = field.animal_count || 0;
  const occupationRate = capacity > 0 ? (occupied / capacity) * 100 : 0;
  const available = capacity - occupied;

  const animals = animalsData || [];

  // Calcular estadísticas de los animales
  const animalStats = {
    bySpecies: animals.reduce((acc: any, animal: any) => {
      const species = animal.specie?.name || animal.species?.name || 'Sin especie';
      acc[species] = (acc[species] || 0) + 1;
      return acc;
    }, {}),
    bySex: animals.reduce((acc: any, animal: any) => {
      const sex = animal.sex || 'Sin definir';
      acc[sex] = (acc[sex] || 0) + 1;
      return acc;
    }, {}),
    byBreed: animals.reduce((acc: any, animal: any) => {
      const breed = animal.breed?.name || 'Sin raza';
      acc[breed] = (acc[breed] || 0) + 1;
      return acc;
    }, {}),
    avgAge: animals.length > 0 ?
      animals.reduce((sum: number, animal: any) => {
        if (!animal.birth_date) return sum;
        const age = new Date().getFullYear() - new Date(animal.birth_date).getFullYear();
        return sum + age;
      }, 0) / animals.filter((a: any) => a.birth_date).length
      : 0,
  };

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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
          className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full pointer-events-auto
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

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50 px-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 font-medium transition-colors relative ${
                  activeTab === 'overview'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Resumen
                </div>
                {activeTab === 'overview' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('animals')}
                className={`py-3 px-4 font-medium transition-colors relative ${
                  activeTab === 'animals'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Animales ({occupied})
                </div>
                {activeTab === 'animals' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-3 px-4 font-medium transition-colors relative ${
                  activeTab === 'stats'
                    ? 'text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Estadísticas
                </div>
                {activeTab === 'stats' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Tab: Resumen */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Estado */}
                {field.state && (
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-600">
                      Estado Actual
                    </label>
                    <span
                      className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold ${
                        field.state === 'Disponible'
                          ? 'bg-green-100 text-green-800'
                          : field.state === 'Ocupado'
                          ? 'bg-blue-100 text-blue-800'
                          : field.state === 'Mantenimiento'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {field.state}
                    </span>
                  </div>
                )}

                {/* Ocupación */}
                <div>
                  <label className="text-sm font-medium text-gray-600 block mb-3">
                    Ocupación del Potrero
                  </label>
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <span className="text-gray-600 text-sm block mb-1">Actuales</span>
                        <span className="text-3xl font-bold text-gray-900">{occupied}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-600 text-sm block mb-1">Capacidad</span>
                        <span className="text-3xl font-bold text-gray-900">{capacity}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-gray-600 text-sm block mb-1">Disponibles</span>
                        <span className="text-3xl font-bold text-green-600">{available}</span>
                      </div>
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
                      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-red-800 font-medium">
                            Potrero sobrecargado en{' '}
                            <span className="font-bold">
                              {(occupationRate - 100).toFixed(0)}%
                            </span>
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            Se recomienda redistribuir {Math.abs(available)} animales a otros potreros
                          </p>
                        </div>
                      </div>
                    )}

                    {occupationRate > 80 && occupationRate <= 100 && (
                      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-yellow-800 font-medium">
                            Potrero cerca de su capacidad máxima
                          </p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Quedan {available} espacios disponibles
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información adicional en grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {field.area && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Maximize2 className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Área Total</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{field.area}</p>
                      {capacity > 0 && field.area && (
                        <p className="text-xs text-blue-700 mt-1">
                          {(parseFloat(field.area) / capacity).toFixed(2)} ha por animal
                        </p>
                      )}
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

                  {field.created_at && (
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">
                          Fecha de Registro
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-purple-900">
                        {formatDate(field.created_at)}
                      </p>
                    </div>
                  )}

                  {field.updated_at && (
                    <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5 text-orange-600" />
                        <span className="text-sm font-medium text-orange-900">
                          Última Actualización
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-orange-900">
                        {formatDate(field.updated_at)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Densidad de ocupación */}
                {field.area && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Métricas de Densidad
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {capacity > 0 ? (parseFloat(field.area) / capacity).toFixed(2) : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">ha / animal (capacidad)</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {occupied > 0 ? (parseFloat(field.area) / occupied).toFixed(2) : 'N/A'}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">ha / animal (actual)</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {(occupied / parseFloat(field.area)).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">animales / ha</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Animales */}
            {activeTab === 'animals' && (
              <div className="space-y-4">
                {animalsLoading ? (
                  <div className="text-center py-12">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                    <p className="text-gray-600 mt-4">Cargando animales...</p>
                  </div>
                ) : animals.length > 0 ? (
                  <>
                    <p className="text-sm text-gray-600">
                      Se encontraron <span className="font-semibold text-gray-900">{animals.length}</span> animales en este potrero
                    </p>
                    <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                      {animals.map((animal: any) => (
                        <div
                          key={animal.id}
                          className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {animal.record || animal.name || `Animal #${animal.id}`}
                              </h4>
                              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                {animal.specie?.name && (
                                  <span className="text-gray-600">
                                    🦊 {animal.specie.name}
                                  </span>
                                )}
                                {animal.breed?.name && (
                                  <span className="text-gray-600">
                                    🧬 {animal.breed.name}
                                  </span>
                                )}
                                {animal.sex && (
                                  <span className="text-gray-600">
                                    {animal.sex === 'Macho' ? '♂' : '♀'} {animal.sex}
                                  </span>
                                )}
                                {animal.birth_date && (
                                  <span className="text-gray-600">
                                    📅 {formatDate(animal.birth_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              className="text-blue-600 hover:text-blue-700 p-2"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No hay animales registrados en este potrero</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Estadísticas */}
            {activeTab === 'stats' && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4">
                    Distribución por Especie
                  </h3>
                  {Object.keys(animalStats.bySpecies).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(animalStats.bySpecies).map(([species, count]: [string, any]) => (
                        <div key={species} className="flex items-center justify-between">
                          <span className="text-blue-800">{species}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-blue-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${(count / animals.length) * 100}%` }}
                              />
                            </div>
                            <span className="font-semibold text-blue-900 w-12 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-blue-700 text-sm">Sin datos disponibles</p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-6 border border-pink-200">
                  <h3 className="text-lg font-semibold text-pink-900 mb-4">
                    Distribución por Sexo
                  </h3>
                  {Object.keys(animalStats.bySex).length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(animalStats.bySex).map(([sex, count]: [string, any]) => (
                        <div key={sex} className="text-center">
                          <div className="text-3xl font-bold text-pink-900">{count}</div>
                          <div className="text-sm text-pink-700 mt-1">{sex}</div>
                          <div className="text-xs text-pink-600 mt-1">
                            {((count / animals.length) * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-pink-700 text-sm">Sin datos disponibles</p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-semibold text-green-900 mb-4">
                    Distribución por Raza
                  </h3>
                  {Object.keys(animalStats.byBreed).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(animalStats.byBreed).map(([breed, count]: [string, any]) => (
                        <div key={breed} className="flex items-center justify-between">
                          <span className="text-green-800">{breed}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-green-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${(count / animals.length) * 100}%` }}
                              />
                            </div>
                            <span className="font-semibold text-green-900 w-12 text-right">
                              {count}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-green-700 text-sm">Sin datos disponibles</p>
                  )}
                </div>

                {animalStats.avgAge > 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
                    <h3 className="text-lg font-semibold text-purple-900 mb-2">
                      Edad Promedio
                    </h3>
                    <div className="text-4xl font-bold text-purple-900">
                      {animalStats.avgAge.toFixed(1)} años
                    </div>
                  </div>
                )}
              </div>
            )}
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
                       focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center gap-2"
            >
              <Activity className="h-4 w-4" />
              Editar Potrero
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default FieldDetailsModal;
