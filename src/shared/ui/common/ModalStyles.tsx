/**
 * Componentes y utilidades para estilos consistentes en modales
 *
 * Este archivo proporciona componentes reutilizables y clases de utilidad
 * para mantener un diseño uniforme en todos los modales de la aplicación.
 */

import React from 'react';

/**
 * Clases de estilo comunes para modales
 */
// eslint-disable-next-line react-refresh/only-export-components
export const modalStyles = {
  // Espaciado
  spacing: {
    section: 'space-y-3',
    sectionLarge: 'space-y-4',
    sectionSmall: 'space-y-2',
    grid: 'gap-3',
    gridLarge: 'gap-4',
  },

  // Tarjetas
  card: {
    base: 'bg-[color-mix(in_srgb,hsl(var(--card))_80%,transparent)] border border-[color-mix(in_srgb,hsl(var(--border))_60%,transparent)] rounded-xl p-3 shadow-sm shadow-black/10 backdrop-blur-sm',
    hover: 'bg-[color-mix(in_srgb,hsl(var(--card))_84%,transparent)] border border-[color-mix(in_srgb,hsl(var(--border))_60%,transparent)] rounded-xl p-3 shadow-sm shadow-black/10 backdrop-blur-sm hover:shadow-md hover:shadow-black/15 transition-shadow',
  },

  // Títulos de sección
  sectionTitle: 'text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5',

  // Indicador decorativo
  sectionIndicator: 'w-1 h-3.5 bg-foreground/20 rounded-full',

  // Labels de campos
  fieldLabel: 'text-xs text-foreground/70 mb-1.5 font-medium',

  // Valores de campos
  fieldValue: {
    normal: 'text-xs sm:text-sm font-medium text-foreground',
    large: 'text-base sm:text-lg font-semibold text-foreground',
    xlarge: 'text-lg sm:text-xl font-bold text-foreground',
  },

  // Grid de dos columnas responsive
  twoColGrid: 'grid grid-cols-1 md:grid-cols-2 gap-3 items-start min-w-0',

  // Grid interno de campos
  fieldsGrid: 'grid grid-cols-2 gap-3',
};

/**
 * Componente para el título de una sección
 */
export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className={modalStyles.sectionTitle}>
    <div className={modalStyles.sectionIndicator}></div>
    {children}
  </h3>
);

/**
 * Componente para una tarjeta de sección
 */
export const SectionCard: React.FC<{
  children: React.ReactNode;
  title?: string;
  className?: string;
}> = ({ children, title, className = '' }) => (
  <div className={`${modalStyles.card.base} ${className}`}>
    {title && <SectionTitle>{title}</SectionTitle>}
    {children}
  </div>
);

/**
 * Componente para un campo de información
 */
export const InfoField: React.FC<{
  label: string;
  value: React.ReactNode;
  valueSize?: 'normal' | 'large' | 'xlarge';
  className?: string;
}> = ({ label, value, valueSize = 'normal', className = '' }) => (
  <div className={className}>
    <div className={modalStyles.fieldLabel}>{label}</div>
    <div className={modalStyles.fieldValue[valueSize]}>{value}</div>
  </div>
);

/**
 * Componente para el contenedor principal de dos columnas
 */
export const TwoColumnLayout: React.FC<{
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}> = ({ left, right, className = '' }) => (
  <div className={`${modalStyles.twoColGrid} ${className}`}>
    <div className={modalStyles.spacing.section}>{left}</div>
    <div className={modalStyles.spacing.section}>{right}</div>
  </div>
);
