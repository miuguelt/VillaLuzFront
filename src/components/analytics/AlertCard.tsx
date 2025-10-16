import React from 'react';
import {
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface Alert {
  id?: string | number;
  type: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  action_required?: string;
  created_at?: string;
}

interface AlertCardProps {
  alert: Alert;
  onAction?: (alert: Alert) => void;
}

/**
 * Componente para mostrar alertas del sistema
 * Soporta tres niveles de severidad: critical, warning, info
 */
const AlertCard: React.FC<AlertCardProps> = ({ alert, onAction }) => {
  const severityConfig = {
    critical: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-800',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-500',
      textColor: 'text-yellow-800',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-800',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  };

  const config = severityConfig[alert.severity] || severityConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 rounded-r-lg hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${config.textColor} mt-0.5 flex-shrink-0`} />
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-semibold ${config.textColor}`}>
            {alert.title}
          </h3>
          <p className={`text-sm ${config.textColor} mt-1`}>{alert.message}</p>

          {alert.created_at && (
            <p className="text-xs text-gray-500 mt-2">
              {new Date(alert.created_at).toLocaleString('es-ES')}
            </p>
          )}

          {alert.action_required && onAction && (
            <button
              onClick={() => onAction(alert)}
              className={`mt-3 px-4 py-2 text-xs font-medium text-white rounded-md ${config.buttonColor} transition-colors`}
            >
              {alert.action_required}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertCard;
