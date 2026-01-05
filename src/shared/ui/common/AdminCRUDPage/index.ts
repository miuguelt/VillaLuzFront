/*
 * AdminCRUDPage Components
 * 
 * Exportación de todos los componentes refactorizados y optimizados.
 */

// Componente principal optimizado
export { OptimizedAdminCRUDPage as default } from './OptimizedAdminCRUDPage';

// Componentes especializados
export { default as CRUDTable } from './CRUDTable';
export { default as CRUDForm } from './CRUDForm';
export { default as CRUDPagination } from './CRUDPagination';
export { default as CRUDSearch } from './CRUDSearch';
export { default as CRUDToolbar } from './CRUDToolbar';

// Interfaces y tipos (reexportar del componente original)
export type {
  CRUDColumn,
  CRUDFormField,
  CRUDFormSection,
  CRUDConfig,
  AdminCRUDPageProps,
} from '../AdminCRUDPage';
