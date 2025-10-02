/**
 * Hook para usar dentro de componentes envueltos por OptimizedFormWrapper
 */
export function useOptimizedFormData() {
  // Este hook puede ser usado por los componentes hijos para acceder a los datos optimizados
  // Los datos se pasan como props, pero este hook puede proporcionar una interfaz más limpia
  
  return {
    // Placeholder - los datos reales vienen como props del wrapper
    getOptimizedData: (entityName: string, props: any) => {
      return props?.optimizedData?.[entityName] || [];
    },
    isOptimized: (props: any) => {
      return props?.isOptimized || false;
    }
  };
}