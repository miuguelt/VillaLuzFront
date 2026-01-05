import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import {
  ChartBarIcon,
  MapIcon,
  DocumentChartBarIcon,
  ArrowTrendingUpIcon,
  HeartIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

/**
 * Página de inicio del Dashboard Administrativo
 * Muestra cards de acceso rápido a las diferentes secciones de analytics
 */
const AdminDashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { useDashboard } = useAnalytics();
  const { data: dashboardStats, isLoading } = useDashboard();

  const analyticsCards = [
    {
      title: 'Dashboard Ejecutivo',
      description: 'Vista completa de métricas, KPIs, gráficos y alertas del sistema',
      icon: ChartBarIcon,
      path: '/dashboard/admin/analytics/executive',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      stats: dashboardStats ? {
        primary: `${dashboardStats.animales_registrados?.valor || 0} Animales`,
        secondary: `${dashboardStats.alertas_sistema?.valor || 0} Alertas`
      } : null
    },
    {
      title: 'Análisis de Potreros',
      description: 'Ocupación, capacidad y distribución de animales en campos',
      icon: MapIcon,
      path: '/dashboard/admin/analytics/fields',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      stats: dashboardStats ? {
        primary: `${dashboardStats.campos_registrados?.valor || 0} Campos`,
        secondary: 'Ver distribución'
      } : null
    },
    {
      title: 'Reportes Personalizados',
      description: 'Genera reportes customizados de salud, producción e inventario',
      icon: DocumentChartBarIcon,
      path: '/dashboard/admin/analytics/reports',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      stats: null
    }
  ];

  const quickStats = [
    {
      label: 'Animales Activos',
      value: dashboardStats?.animales_activos?.valor || 0,
      icon: HeartIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Tratamientos Activos',
      value: dashboardStats?.tratamientos_activos?.valor || 0,
      icon: ArrowTrendingUpIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Personal Registrado',
      value: dashboardStats?.usuarios_registrados?.valor || 0,
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-full bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Panel de Administración
        </h1>
        <p className="text-gray-600">
          Bienvenido al sistema de gestión ganadera. Accede a estadísticas, reportes y análisis detallados.
        </p>
      </div>

      {/* Quick Stats */}
      {!isLoading && dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className={`${stat.bgColor} rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.label}</p>
                    <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                  <Icon className={`w-12 h-12 ${stat.color}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Analytics Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Módulos de analítica
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyticsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(card.path)}
                className={`${card.color} ${card.hoverColor} text-white rounded-lg p-6 text-left transition-all hover:shadow-xl hover:scale-105 transform duration-200`}
              >
                <div className="flex items-start justify-between mb-4">
                  <Icon className="w-10 h-10" />
                  {card.stats && !isLoading && (
                    <div className="text-right">
                      <p className="text-sm opacity-90">{card.stats.primary}</p>
                      <p className="text-xs opacity-75">{card.stats.secondary}</p>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-2">{card.title}</h3>
                <p className="text-sm opacity-90">{card.description}</p>
                <div className="mt-4 flex items-center text-sm font-medium">
                  <span>Ver más</span>
                  <svg
                    className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Management Links */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Gestión Rápida
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/dashboard/admin/users')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-center"
          >
            <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Usuarios</span>
          </button>

          {/* Puedes agregar más enlaces aquí según tus módulos */}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-gray-700">Cargando estadísticas...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardOverview;
