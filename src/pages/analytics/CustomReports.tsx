import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import analyticsService from '@/services/analyticsService';
import {
  DocumentChartBarIcon,
  ArrowDownTrayIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

/**
 * Página para generar reportes personalizados
 * Consume el endpoint POST /api/analytics/reports/custom
 */
const CustomReports: React.FC = () => {
  const [config, setConfig] = useState({
    period: '1y',
    metrics: ['animals' as string],
    groupBy: [] as string[],
    filters: {} as Record<string, any>,
  });

  const generateReport = useMutation({
    mutationFn: async (cfg: any) => {
      const response = await fetch('http://localhost:5180/api/analytics/reports/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(cfg),
      });
      if (!response.ok) throw new Error('Error al generar el reporte');
      return response.json();
    },
  });

  const handleGenerate = () => {
    generateReport.mutate(config);
  };

  const handleDownloadJSON = () => {
    if (!generateReport.data) return;
    const dataStr = JSON.stringify(generateReport.data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = `reporte-${new Date().toISOString()}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleDownloadCSV = () => {
    if (!generateReport.data) return;

    // Convertir datos a CSV (simplificado)
    let csv = 'Métrica,Valor\n';
    const flattenObject = (obj: any, prefix = ''): void => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          flattenObject(value, `${prefix}${key}.`);
        } else {
          csv += `${prefix}${key},${value}\n`;
        }
      }
    };
    flattenObject(generateReport.data);

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metricsOptions = [
    { value: 'animals', label: 'Animales', description: 'Estadísticas de inventario de animales' },
    { value: 'health', label: 'Salud', description: 'Tratamientos, vacunaciones y enfermedades' },
    { value: 'production', label: 'Producción', description: 'Peso, GMD y productividad' },
    { value: 'fields', label: 'Campos', description: 'Ocupación y gestión de potreros' },
  ];

  const groupByOptions = [
    { value: 'breed', label: 'Raza' },
    { value: 'field', label: 'Campo/Potrero' },
    { value: 'species', label: 'Especie' },
    { value: 'month', label: 'Mes' },
    { value: 'health_status', label: 'Estado de Salud' },
  ];

  const periodOptions = [
    { value: '1m', label: '1 mes' },
    { value: '3m', label: '3 meses' },
    { value: '6m', label: '6 meses' },
    { value: '1y', label: '1 año' },
    { value: '2y', label: '2 años' },
    { value: 'all', label: 'Todo el historial' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <DocumentChartBarIcon className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Reportes Personalizados</h1>
        </div>
        <p className="text-gray-600">
          Genera reportes personalizados con las métricas y filtros que necesites
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panel de configuración */}
        <div className="lg:col-span-2 space-y-6">
          {/* Configuración del reporte */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-6">
              <Cog6ToothIcon className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold">Configuración del Reporte</h2>
            </div>

            {/* Período */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período de Análisis
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {periodOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setConfig({ ...config, period: option.value })}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      config.period === option.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Métricas */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Métricas a Incluir
              </label>
              <div className="space-y-3">
                {metricsOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      config.metrics.includes(option.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={config.metrics.includes(option.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfig({
                            ...config,
                            metrics: [...config.metrics, option.value],
                          });
                        } else {
                          setConfig({
                            ...config,
                            metrics: config.metrics.filter((m) => m !== option.value),
                          });
                        }
                      }}
                      className="mt-1 mr-3 w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                    </div>
                    {config.metrics.includes(option.value) && (
                      <CheckCircleIcon className="w-5 h-5 text-blue-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Agrupar Por */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Agrupar Resultados Por (Opcional)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {groupByOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      const newGroupBy = config.groupBy.includes(option.value)
                        ? config.groupBy.filter((g) => g !== option.value)
                        : [...config.groupBy, option.value];
                      setConfig({ ...config, groupBy: newGroupBy });
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      config.groupBy.includes(option.value)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón generar */}
            <button
              onClick={handleGenerate}
              disabled={generateReport.isPending || config.metrics.length === 0}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {generateReport.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Generando Reporte...
                </>
              ) : (
                <>
                  <DocumentChartBarIcon className="w-5 h-5" />
                  Generar Reporte
                </>
              )}
            </button>

            {config.metrics.length === 0 && (
              <p className="text-center text-sm text-red-600 mt-2">
                Selecciona al menos una métrica para generar el reporte
              </p>
            )}
          </div>
        </div>

        {/* Panel de resultados */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h3 className="font-semibold mb-4">Configuración Actual</h3>

            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-600">Período:</span>
                <span className="ml-2 font-medium">
                  {periodOptions.find((p) => p.value === config.period)?.label}
                </span>
              </div>

              <div>
                <span className="text-gray-600">Métricas:</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {config.metrics.map((m) => (
                    <span
                      key={m}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                    >
                      {metricsOptions.find((opt) => opt.value === m)?.label}
                    </span>
                  ))}
                  {config.metrics.length === 0 && (
                    <span className="text-gray-400 text-xs">Ninguna seleccionada</span>
                  )}
                </div>
              </div>

              {config.groupBy.length > 0 && (
                <div>
                  <span className="text-gray-600">Agrupar por:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {config.groupBy.map((g) => (
                      <span
                        key={g}
                        className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                      >
                        {groupByOptions.find((opt) => opt.value === g)?.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {generateReport.isSuccess && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-green-600 font-medium mb-3 flex items-center gap-2">
                  <CheckCircleIcon className="w-5 h-5" />
                  Reporte Generado
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleDownloadJSON}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Descargar JSON
                  </button>
                  <button
                    onClick={handleDownloadCSV}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Descargar CSV
                  </button>
                </div>
              </div>
            )}

            {generateReport.isError && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-red-600">
                  Error al generar el reporte. Intenta nuevamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resultados */}
      {generateReport.isSuccess && generateReport.data && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Resultados del Reporte</h2>
          <div className="bg-gray-50 rounded-lg p-4 overflow-auto max-h-96">
            <pre className="text-xs text-gray-700">
              {JSON.stringify(generateReport.data, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomReports;
