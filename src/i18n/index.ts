import React, { createContext, useContext, ReactNode, useMemo } from 'react';

// i18n ligero con fallback
// - No depende de librerías externas
// - Provee t(key, defaultText?) -> string
// - Permite inyectar mensajes por props o extender posteriormente por idioma

export type I18nMessages = Record<string, string>;

export interface I18nProviderProps {
  children: ReactNode;
  messages?: I18nMessages;
  locale?: string;
}

type I18nContextValue = {
  t: (key: string, defaultText?: string) => string;
  locale: string;
  messages: I18nMessages;
};

const defaultEs: I18nMessages = {
  'common.search': 'Buscar...',
  'common.create': 'Crear',
  'common.cancel': 'Cancelar',
  'common.update': 'Actualizar',
  'common.saving': 'Guardando...',
  'common.edit': 'Editar',
  'common.delete': 'Eliminar',
  'common.deleting': 'Eliminando...',
  'common.previous': 'Anterior',
  'common.next': 'Siguiente',
  'common.page': 'Página',
  'common.of': 'de',
  'common.configure': 'Configurar',
  'common.online': 'En línea',
  'state.loading': 'Cargando...',
  'state.error': 'Ocurrió un error inesperado',
  'state.empty.title': 'Sin datos',
  'state.empty.description': 'Crea el primer registro para comenzar.',
  'modal.close': 'Cerrar',
  // nuevas claves
  'crud.save_error': 'Error al guardar',
  'crud.delete_error': 'Error al eliminar',
  'crud.confirm_delete': '¿Seguro que deseas eliminar este registro?',
  'common.actions': 'Acciones',
  'table.sort_hint': 'Ordenar',

  // Dashboard: pestañas
  'dashboard.tabs.overview': 'Resumen',
  'dashboard.tabs.system': 'Sistema',
  'dashboard.tabs.settings': 'Ajustes',

  // Dashboard: cards principales
  'dashboard.cards.totalUsers': 'Usuarios registrados',
  'dashboard.cards.totalUsersDesc': 'Número total de usuarios en el sistema.',
  'dashboard.cards.activeUsers': 'Usuarios activos',
  'dashboard.cards.activeUsersDesc': 'Usuarios con actividad reciente o sesión activa.',
  'dashboard.cards.totalAnimals': 'Animales registrados',
  'dashboard.cards.totalAnimalsDesc': 'Total de animales con ficha en la base de datos.',
  'dashboard.cards.activeTreatments': 'Tratamientos activos',
  'dashboard.cards.activeTreatmentsDesc': 'Tratamientos actualmente en curso.',
  'dashboard.cards.pendingTasks': 'Tareas pendientes',
  'dashboard.cards.pendingTasksDesc': 'Acciones que requieren atención.',
  'dashboard.cards.systemAlerts': 'Alertas del sistema',
  'dashboard.cards.systemAlertsDesc': 'Notificaciones y advertencias generadas por el sistema.',

  // Dashboard: cards adicionales para visión general
  'dashboard.cards.totalTreatments': 'Tratamientos totales',
  'dashboard.cards.totalTreatmentsDesc': 'Cantidad histórica de tratamientos registrados.',
  'dashboard.cards.totalVaccinations': 'Vacunas aplicadas',
  'dashboard.cards.totalVaccinationsDesc': 'Vacunaciones registradas en el sistema.',
  'dashboard.cards.totalControls': 'Controles realizados',
  'dashboard.cards.totalControlsDesc': 'Controles de producción/seguimiento ejecutados.',
  'dashboard.cards.totalFields': 'Campos registrados',
  'dashboard.cards.totalFieldsDesc': 'Número de lotes/campos administrados.',

  // Dashboard: catálogo y relaciones
  'dashboard.cards.vaccines': 'Vacunas',
  'dashboard.cards.vaccinesDesc': 'Catálogo de vacunas disponibles.',
  'dashboard.cards.vaccinations': 'Vacunaciones',
  'dashboard.cards.vaccinationsDesc': 'Registros de vacunaciones aplicadas.',
  'dashboard.cards.medications': 'Medicamentos',
  'dashboard.cards.medicationsDesc': 'Catálogo de medicamentos registrados.',
  'dashboard.cards.diseases': 'Enfermedades',
  'dashboard.cards.diseasesDesc': 'Catálogo de enfermedades administradas.',
  'dashboard.cards.species': 'Especies',
  'dashboard.cards.speciesDesc': 'Catálogo de especies registradas.',
  'dashboard.cards.breeds': 'Razas',
  'dashboard.cards.breedsDesc': 'Catálogo de razas disponibles.',
  'dashboard.cards.animalFields': 'Animales por campo',
  'dashboard.cards.animalFieldsDesc': 'Relaciones Animal-Campo registradas.',
  'dashboard.cards.diseaseAnimals': 'Animales por enfermedad',
  'dashboard.cards.diseaseAnimalsDesc': 'Relaciones Animal-Enfermedad registradas.',
  'dashboard.cards.geneticImprovements': 'Mejoras genéticas',
  'dashboard.cards.geneticImprovementsDesc': 'Intervenciones de mejora genética.',
  'dashboard.cards.treatmentMedications': 'Tratamientos con medicamentos',
  'dashboard.cards.treatmentMedicationsDesc': 'Registros de tratamientos con fármacos.',
  'dashboard.cards.treatmentVaccines': 'Tratamientos con vacunas',
  'dashboard.cards.treatmentVaccinesDesc': 'Registros de tratamientos con vacunas.',
  'dashboard.cards.foodTypes': 'Tipos de alimento',
  'dashboard.cards.foodTypesDesc': 'Catálogo de alimentos disponibles.',

  // Dashboard: alertas
  'dashboard.alerts.title': 'Alertas',
  'dashboard.alerts.description': 'Estado y actividad de alertas del sistema.',
  'dashboard.alerts.noAlerts': 'Sin alertas por el momento.',
  'dashboard.alerts.markedAsRead': 'Alerta marcada como leída',
  'dashboard.alerts.allMarkedAsRead': 'Todas las alertas marcadas como leídas',
  'dashboard.actions.markAllRead': 'Marcar todas como leídas',
  'dashboard.errors.fetchUsers': 'No se pudieron cargar los usuarios',
  'dashboard.errors.fetchAlerts': 'No se pudieron cargar las alertas',
  'dashboard.errors.markAlertRead': 'Error al marcar la alerta',
  'dashboard.errors.markAllAlertsRead': 'Error al marcar todas las alertas',

  // Dashboard: usuarios recientes
  'dashboard.recentUsers.title': 'Usuarios recientes',
  'dashboard.recentUsers.description': 'Últimos usuarios añadidos al sistema.',
  'dashboard.recentUsers.noUsers': 'No hay usuarios recientes.',
  'dashboard.recentUsers.viewAll': 'Ver todos',

  // Dashboard: sistema
  'dashboard.system.title': 'Sistema',
  'dashboard.system.description': 'Información general del sistema.',
  'dashboard.system.version': 'Versión',
  'dashboard.system.environment': 'Entorno',
  'dashboard.system.lastUpdate': 'Última actualización',
  'dashboard.system.database': 'Base de datos',
  'dashboard.system.storage': 'Almacenamiento',
  'dashboard.system.apiStatus': 'Estado de la API',
  'dashboard.system.performance.title': 'Rendimiento',
  'dashboard.system.performance.description': 'Uso de recursos del sistema.',
  'dashboard.system.performance.cpu': 'CPU',
  'dashboard.system.performance.memory': 'Memoria',
  'dashboard.system.performance.disk': 'Disco',

  // Dashboard: ajustes
  'dashboard.settings.title': 'Ajustes',
  'dashboard.settings.description': 'Preferencias y opciones del sistema.',
  'dashboard.settings.notifications': 'Notificaciones',
  'dashboard.settings.notificationsDesc': 'Configura alertas y avisos.',
  'dashboard.settings.security': 'Seguridad',
  'dashboard.settings.securityDesc': 'Opciones de autenticación y acceso.',
  'dashboard.settings.appearance': 'Apariencia',
  'dashboard.settings.appearanceDesc': 'Tema y estilo visual.',

  // Dashboard: actividad
  'dashboard.activity.title': 'Actividad',
  'dashboard.activity.description': 'Actualizaciones y eventos recientes.',
  'dashboard.activity.itemTitle': 'Actualización del sistema',
  'dashboard.activity.itemDesc': 'Se aplicaron mejoras de rendimiento y correcciones de errores',
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

export function I18nProvider({ children, messages, locale = 'es' }: I18nProviderProps) {
  const merged = useMemo<I18nMessages>(() => ({ ...defaultEs, ...(messages || {}) }), [messages]);

  const value = useMemo<I18nContextValue>(() => {
    const t = (key: string, defaultText?: string) => {
      if (!key) return defaultText ?? '';
      return merged[key] ?? defaultText ?? key;
    };
    return { t, locale, messages: merged };
  }, [merged, locale]);

  return React.createElement(I18nContext.Provider, { value }, children as any);
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider');
  return ctx;
}

// Atajo: devuelve solo la función t()
export function useT() {
  const { t } = useI18n();
  return t;
}

// Utilidad para obtener traducción fuera de React (inyectable posteriormente si se requiere)
export const i18n = {
  locale: 'es',
  messages: { ...defaultEs } as I18nMessages,
  t(key: string, def?: string) {
    return (this.messages?.[key] as string | undefined) ?? def ?? key;
  },
};

// Helper para actualizar mensajes globales fuera del Provider (opcional)
export function extendMessages(extra: I18nMessages) {
  i18n.messages = { ...i18n.messages, ...extra };
}
