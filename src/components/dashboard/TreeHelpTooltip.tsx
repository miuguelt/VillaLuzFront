import React from 'react';
import { HelpCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { cn } from '@/components/ui/cn.ts';

interface TreeHelpTooltipProps {
  type: 'ancestors' | 'descendants';
  className?: string;
}

export const TreeHelpTooltip: React.FC<TreeHelpTooltipProps> = ({ type, className }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const helpContent = type === 'ancestors' ? {
    title: 'Árbol de Antepasados',
    description: 'Muestra la línea genealógica ascendente del animal (padres, abuelos, bisabuelos...).',
    requirements: [
      'El animal debe tener padres registrados (idFather/idMother)',
      'Los padres también deben tener sus propios padres para mostrar más niveles',
      'Use max_depth para controlar cuántas generaciones mostrar'
    ],
    troubleshooting: [
      'Si solo ve la raíz: el animal no tiene padres registrados',
      'Si faltan generaciones: verifique que los padres tengan sus propios padres',
      'Error 401: inicie sesión nuevamente',
      'Error 404: el animal no existe o no tiene datos genealógicos'
    ],
    tips: [
      'Use el slider de generaciones para explorar progresivamente',
      'El modo de línea filtrada muestra solo paterna o materna',
      'Los colores indican el sexo: azul para machos, rosa para hembras'
    ]
  } : {
    title: 'Árbol de Descendientes',
    description: 'Muestra la línea genealógica descendente del animal (hijos, nietos, bisnietos...).',
    requirements: [
      'Otros animales deben tener este animal como padre (idFather) o madre (idMother)',
      'Los hijos también deben tener sus propios hijos para mostrar más niveles',
      'Use max_depth para controlar cuántas generaciones mostrar'
    ],
    troubleshooting: [
      'Si solo ve la raíz: ningún animal tiene este como padre/madre',
      'Si faltan generaciones: verifique que los hijos tengan sus propios hijos',
      'Error 401: inicie sesión nuevamente',
      'Error 404: el animal no existe o no tiene datos genealógicos'
    ],
    tips: [
      'Use el slider de generaciones para explorar progresivamente',
      'Los colores indican el sexo: azul para machos, rosa para hembras',
      'Puede hacer clic en cualquier animal para ver más detalles'
    ]
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        title={`Ayuda sobre ${helpContent.title.toLowerCase()}`}
      >
        <HelpCircle className="w-3 h-3 text-primary" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Tooltip */}
          <div className="absolute right-0 top-6 w-80 bg-background border border-border rounded-lg shadow-lg z-50 p-4 max-h-96 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">{helpContent.title}</h3>
            </div>
            
            <p className="text-xs text-muted-foreground mb-3">
              {helpContent.description}
            </p>

            <div className="space-y-3">
              {/* Requisitos */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  <span className="text-xs font-medium">Requisitos:</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  {helpContent.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-green-600 mt-0.5">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Solución de problemas */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3 text-yellow-600" />
                  <span className="text-xs font-medium">Problemas comunes:</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  {helpContent.troubleshooting.map((problem, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span>{problem}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Consejos */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Info className="w-3 h-3 text-blue-600" />
                  <span className="text-xs font-medium">Consejos:</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                  {helpContent.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-blue-600 mt-0.5">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full text-xs text-center text-primary hover:text-primary/80 transition-colors"
            >
              Cerrar ayuda
            </button>
          </div>
        </>
      )}
    </div>
  );
};