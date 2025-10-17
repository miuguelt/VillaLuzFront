import React from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';
import KPICard from '@/components/analytics/KPICard';
import AlertCard from '@/components/analytics/AlertCard';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { COLORS } from '@/utils/colors';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Dashboard Ejecutivo - Vista principal de analytics
 * Muestra KPIs, gráficos y alertas críticas
 */
const DashboardExecutive: React.FC = () => {
  const { useDashboard, useAnimalTrends, useAlerts } = useAnalytics();

  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const { data: trends, isLoading: loadingTrends, error: trendsError } = useAnimalTrends(12);
  const { data: alerts, isLoading: loadingAlerts } = useAlerts({
    priority: 'critical',
    limit: 5,
  });

  if (loadingDashboard) {
    return <LoadingDashboard />;
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  // Datos para gráfico de dona (distribución por sexo)
  const sexDistributionData = {
    labels: ['Machos', 'Hembras'],
    datasets: [
      {
        data: [
          dashboard.distribucion_sexo?.machos || 0,
          dashboard.distribucion_sexo?.hembras || 0,
        ],
        backgroundColor: [COLORS.animals.male, COLORS.animals.female],
        borderWidth: 2,
        borderColor: '#fff',
      },
    ],
  };

  // Datos para gráfico de líneas (tendencias)
  const trendsData = trends
    ? {
        labels: trends.map((t: any) => {
          const [year, month] = t.month.split('-');
          return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es', {
            month: 'short',
          });
        }),
        datasets: [
          {
            label: 'Nacimientos',
            data: trends.map((t: any) => t.births),
            borderColor: COLORS.charts.success,
            backgroundColor: `${COLORS.charts.success}20`,
            tension: 0.4,
            fill: true,
          },
          {
            label: 'Muertes',
            data: trends.map((t: any) => t.deaths),
            borderColor: COLORS.charts.danger,
            tension: 0.4,
          },
          {
            label: 'Ventas',
            data: trends.map((t: any) => t.sales),
            borderColor: COLORS.charts.warning,
            tension: 0.4,
          },
        ],
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
        <p className="text-gray-600 mt-2">Vista general del estado de la finca</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KPICard
          title="Animales Registrados"
          value={dashboard.animales_registrados?.valor || 0}
          change={dashboard.animales_registrados?.cambio_porcentual}
          icon="🐄"
          loading={loadingDashboard}
        />
        <KPICard
          title="Animales Vivos"
          value={dashboard.animales_activos?.valor || 0}
          change={dashboard.animales_activos?.cambio_porcentual}
          icon="💚"
          loading={loadingDashboard}
        />
        <KPICard
          title="Índice de Salud"
          value={`${
            (dashboard.distribucion_salud?.excelente || 0) +
            (dashboard.distribucion_salud?.bueno || 0)
          }/${dashboard.animales_activos?.valor || 0}`}
          icon="🏥"
          loading={loadingDashboard}
        />
        <KPICard
          title="Alertas Activas"
          value={dashboard.alertas_sistema?.valor || 0}
          change={dashboard.alertas_sistema?.cambio_porcentual}
          icon="🔔"
          loading={loadingDashboard}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Gráfico de Dona */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Distribución por Sexo
          </h2>
          <div className="h-64 flex items-center justify-center">
            <Doughnut
              data={sexDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const total =
                          (dashboard.distribucion_sexo?.machos || 0) +
                          (dashboard.distribucion_sexo?.hembras || 0);
                        const percentage = total > 0
                          ? ((context.parsed / total) * 100).toFixed(1)
                          : '0.0';
                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                      },
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Gráfico de Líneas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tendencia de Inventario (12 meses)
          </h2>
          <div className="h-64">
            {loadingTrends ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">Cargando datos...</p>
              </div>
            ) : trendsError ? (
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-gray-400 text-sm">📊</p>
                <p className="text-gray-400 text-xs mt-2">Endpoint no disponible</p>
              </div>
            ) : trendsData ? (
              <Line
                data={trendsData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-400">No hay datos disponibles</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertas Críticas */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Alertas Críticas</h2>
          <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
            {alerts?.alerts?.length || 0} activas
          </span>
        </div>

        {loadingAlerts ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : alerts?.alerts && alerts.alerts.length > 0 ? (
          <div className="space-y-4">
            {alerts.alerts.map((alert: any, index: number) => (
              <AlertCard
                key={alert.id || index}
                alert={alert}
                onAction={(alert) => console.log('Action:', alert)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p className="text-4xl mb-2">✅</p>
            <p>No hay alertas críticas</p>
          </div>
        )}
      </div>

      {/* Estadísticas Adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Distribución por Raza */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Razas</h3>
          <div className="space-y-3">
            {dashboard.distribucion_razas_top5?.slice(0, 5).map((raza: any, index: number) => {
              const total = dashboard.animales_activos?.valor || 1;
              const percentage = ((raza.cantidad / total) * 100).toFixed(1);
              return (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{raza.raza}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                      {raza.cantidad}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estado de Salud */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Salud</h3>
          <div className="space-y-3">
            {dashboard.distribucion_salud &&
              Object.entries(dashboard.distribucion_salud).map(([estado, cantidad]) => (
                <div key={estado} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{estado}</span>
                  <span className="text-sm font-semibold text-gray-900">{cantidad as number}</span>
                </div>
              ))}
          </div>
        </div>

        {/* Grupos de Edad */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Grupos de Edad</h3>
          <div className="space-y-3">
            {dashboard.grupos_edad &&
              Object.entries(dashboard.grupos_edad).map(([grupo, cantidad]) => (
                <div key={grupo} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{grupo}</span>
                  <span className="text-sm font-semibold text-gray-900">{cantidad as number}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de Loading
const LoadingDashboard: React.FC = () => (
  <div className="min-h-screen bg-gray-50 p-6">
    <div className="mb-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      ))}
    </div>
  </div>
);

export default DashboardExecutive;
