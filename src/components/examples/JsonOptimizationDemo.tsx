import React, { useState } from 'react';
import { useUsers } from '@/hooks/user/useUser';
import { useAnimals } from '@/hooks/animal/useAnimals';
import { downloadAsJSON, downloadAsCSV } from '@/utils/dataUtils';
import { ChartDataItem } from '@/types/commonTypes';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { getTodayColombia } from '@/utils/dateUtils';

/**
 * Componente de demostración del sistema optimizado JSON
 * Muestra cómo usar las nuevas utilidades de datos y manejo optimizado de JSON
 */
export const JsonOptimizationDemo: React.FC = () => {
  const { userStatusData: usersStatusData, loading: usersLoading, error: usersError, fetchUserStatus: refreshUsers } = useUsers();
  const { animalStatusData, loading: animalsLoading, error: animalsError, fetchAnimalStatus } = useAnimals();
  
  const [activeDemo, setActiveDemo] = useState<'users' | 'animals'>('users');

  const handleExportJSON = (data: ChartDataItem[], filename: string) => {
    downloadAsJSON(data, `${filename}-${getTodayColombia()}`);
  };

  const handleExportCSV = (data: ChartDataItem[], filename: string) => {
    downloadAsCSV(data, `${filename}-${getTodayColombia()}`, {
      status: 'Estado',
      count: 'Cantidad',
      percentage: 'Porcentaje (%)',
      color: 'Color'
    });
  };

  const renderUserStats = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Estadísticas de Usuarios (Optimizado)</h3>
        <div className="space-x-2">
          <button
            onClick={() => refreshUsers()}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={usersLoading}
          >
            {usersLoading ? 'Cargando...' : 'Actualizar'}
          </button>
          <button
            onClick={() => handleExportJSON(usersStatusData, 'usuarios-status')}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!usersStatusData.length}
          >
            Exportar JSON
          </button>
          <button
            onClick={() => handleExportCSV(usersStatusData, 'usuarios-status')}
            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
            disabled={!usersStatusData.length}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {usersError && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {usersError}
        </div>
      )}

      {usersStatusData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de barras */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="text-md font-medium mb-3">Distribución por Estado (Barras)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usersStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'count' ? value : `${value}%`,
                    name === 'count' ? 'Cantidad' : 'Porcentaje'
                  ]}
                />
                <Bar dataKey="count" fill="#10b981" name="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfico circular */}
          <div className="bg-white p-4 rounded-lg border">
            <h4 className="text-md font-medium mb-3">Distribución por Estado (Circular)</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={usersStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.status}: ${props.percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {usersStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#8884d8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Cantidad']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Datos raw optimizados */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-md font-medium mb-2">Datos Raw (Formato Optimizado)</h4>
        <pre className="text-sm bg-white p-3 rounded border overflow-auto max-h-40">
          {JSON.stringify(usersStatusData, null, 2)}
        </pre>
      </div>
    </div>
  );

  const renderAnimalStats = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Estadísticas de Animales (Optimizado)</h3>
        <div className="space-x-2">
          <button
            onClick={() => fetchAnimalStatus()}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={animalsLoading}
          >
            {animalsLoading ? 'Cargando...' : 'Actualizar'}
          </button>
          <button
            onClick={() => handleExportJSON(animalStatusData, 'animales-status')}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            disabled={!animalStatusData.length}
          >
            Exportar JSON
          </button>
          <button
            onClick={() => handleExportCSV(animalStatusData, 'animales-status')}
            className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
            disabled={!animalStatusData.length}
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {animalsError && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {animalsError}
        </div>
      )}

      {animalStatusData.length > 0 ? (
        <div className="bg-white p-4 rounded-lg border">
          <h4 className="text-md font-medium mb-3">Distribución por Estado</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={animalStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'count' ? value : `${value}%`,
                  name === 'count' ? 'Cantidad' : 'Porcentaje'
                ]}
              />
              <Bar dataKey="count" fill="#3b82f6" name="count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <p className="text-yellow-800">No hay datos de animales disponibles o aún se están cargando.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Sistema JSON Optimizado - Demo
        </h1>
        <p className="text-gray-600">
          Demostración del sistema optimizado para manejo de JSON con conversión automática 
          de objetos a arrays para gráficos, tipado fuerte y utilidades de exportación.
        </p>
      </div>

      {/* Selector de demo */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setActiveDemo('users')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeDemo === 'users'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveDemo('animals')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeDemo === 'animals'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Animales
          </button>
        </div>
      </div>

      {/* Características del sistema optimizado */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">🔄 Conversión Automática</h3>
          <p className="text-sm text-green-700">
            Objetos de API se convierten automáticamente a arrays para gráficos
          </p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">🔒 Tipado Fuerte</h3>
          <p className="text-sm text-blue-700">
            Tipos TypeScript específicos en lugar de 'any'
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-2">📊 Utilidades</h3>
          <p className="text-sm text-purple-700">
            Exportación JSON/CSV, retry automático, debounce
          </p>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          {activeDemo === 'users' ? renderUserStats() : renderAnimalStats()}
        </div>
      </div>

      {/* Footer con información técnica */}
      <div className="mt-8 bg-gray-50 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Optimizaciones Implementadas:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• <strong>Conversión automática:</strong> Objetos {'{active_users: 44, inactive_users: 1}'} → Arrays para charts</li>
          <li>• <strong>Retry con backoff:</strong> Reintentos automáticos con delay exponencial</li>
          <li>• <strong>Tipado específico:</strong> UserStatistics, ChartDataItem en lugar de 'any'</li>
          <li>• <strong>Utilidades de exportación:</strong> JSON y CSV con headers personalizados</li>
          <li>• <strong>Manejo de errores:</strong> Estados de carga y error separados</li>
          <li>• <strong>Caché optimizado:</strong> BaseService con caché inteligente</li>
        </ul>
      </div>
    </div>
  );
};
