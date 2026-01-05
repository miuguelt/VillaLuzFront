import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fieldService } from '@/entities/field/api/field.service';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import FieldCard from '@/widgets/analytics/FieldCard';
import KPICard from '@/widgets/analytics/KPICard';
import FieldDetailsModal from '@/widgets/analytics/FieldDetailsModal';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

/**
 * Página de gestión de potreros con analytics
 * Muestra métricas de ocupación y estado de cada potrero
 */
const FieldsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedField, setSelectedField] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Obtener lista de potreros
  const { data: fieldsData, isLoading } = useQuery({
    queryKey: ['fields'],
    queryFn: async () => {
      return fieldService.getPaginated({ limit: 100 });
    },
  });

  // Obtener métricas de ocupación
  const { useFieldOccupation } = useAnalytics();
  const { data: occupation } = useFieldOccupation();

  const fields = fieldsData?.data || [];

  // Filtrar potreros por búsqueda
  const filteredFields = fields.filter(
    (field: any) =>
      field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.ubication?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewDetails = (field: any) => {
    setSelectedField(field);
    setIsModalOpen(true);
  };

  const handleViewAnalytics = (field: any) => {
    console.log('Ver analítica del potrero:', field);
    // TODO: Implementar modal de analítica con gráficos
    alert(`Analítica para ${field.name} - próximamente disponible`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedField(null), 300); // Delay para animación
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Gestión de Potreros</h1>
        <p className="text-gray-600 mt-2">Administra y monitorea tus campos</p>
      </div>

      {/* Métricas Resumen */}
      {occupation && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="Capacidad Total"
            value={occupation.total_capacity || 0}
            icon="📊"
          />
          <KPICard
            title="Animales Ubicados"
            value={occupation.total_occupied || 0}
            icon="🐄"
          />
          <KPICard
            title="Ocupación Promedio"
            value={`${occupation.average_occupation || 0}%`}
            icon="📈"
          />
          <KPICard
            title="Espacios Disponibles"
            value={occupation.available_spots || 0}
            icon="✅"
          />
        </div>
      )}

      {/* Buscador */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar potreros..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Grid de Potreros */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-12 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredFields.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFields.map((field: any) => (
            <FieldCard
              key={field.id}
              field={field}
              onViewDetails={handleViewDetails}
              onViewAnalytics={handleViewAnalytics}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {searchTerm
              ? `No se encontraron potreros que coincidan con "${searchTerm}"`
              : 'No hay potreros registrados'}
          </p>
        </div>
      )}

      {/* Estadísticas adicionales */}
      {occupation && occupation.fields && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución por Estado
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {occupation.fields.map((fieldStat: any, index: number) => (
              <div
                key={index}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  {fieldStat.name}
                </h3>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-gray-900">
                    {fieldStat.occupied}
                  </span>
                  <span className="text-sm text-gray-500">
                    / {fieldStat.capacity}
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      fieldStat.occupation_rate > 100
                        ? 'bg-red-500'
                        : fieldStat.occupation_rate > 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{
                      width: `${Math.min(fieldStat.occupation_rate, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {fieldStat.occupation_rate.toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Detalles */}
      <FieldDetailsModal
        field={selectedField}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default FieldsPage;
