import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip';

interface HelpTooltipProps {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

/**
 * Componente de tooltip para mostrar ayuda contextual al usuario
 * Uso: <HelpTooltip content="Texto de ayuda aquí" />
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  side = 'right',
  className = ''
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors ${className}`}
            aria-label="Ayuda"
          >
            <Info className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Mensajes de ayuda predefinidos para campos comunes
 */
// eslint-disable-next-line react-refresh/only-export-components
export const HELP_MESSAGES = {
  // Animales
  animal: {
    record: 'Identificador único del animal. Ejemplo: REC0001, BOV001',
    birthDate: 'Fecha de nacimiento del animal. Se usa para calcular la edad automáticamente.',
    weight: 'Peso actual del animal en kilogramos. Debe ser un valor positivo.',
    breed: 'Raza del animal. Importante para el seguimiento genético.',
    gender: 'Sexo del animal. Necesario para genealogía y reproducción.',
    status: 'Estado actual: Vivo (animal en la finca), Vendido (ya no está), Muerto (fallecido).',
    father: 'Animal macho que es el padre. Solo puede seleccionar machos.',
    mother: 'Animal hembra que es la madre. Solo puede seleccionar hembras.',
    acquisitionDate: 'Fecha en que el animal fue adquirido o nació en la finca.',
    acquisitionCost: 'Costo de compra o adquisición del animal en pesos.',
    notes: 'Observaciones adicionales sobre el animal.',
  },
  // Usuarios
  user: {
    identification: 'Número de documento de identidad (4-15 dígitos).',
    fullname: 'Nombre completo del usuario.',
    email: 'Correo electrónico válido para notificaciones.',
    phone: 'Número de teléfono de contacto.',
    role: 'Rol en el sistema: Administrador (acceso total), Instructor (gestión), Aprendiz (consulta).',
    password: 'Contraseña segura (mínimo 4 caracteres). No la comparta.',
    status: 'Estado de la cuenta: Activo (puede iniciar sesión) o Inactivo.',
  },
  // Campos/Potreros
  field: {
    name: 'Nombre identificativo del potrero. Ejemplo: Potrero A, Campo Norte.',
    location: 'Ubicación o descripción de dónde se encuentra el potrero.',
    area: 'Área del potrero. Ejemplo: 5 hectáreas, 2.5 ha.',
    capacity: 'Capacidad máxima de animales. Ejemplo: 10 animales, 15 cabezas.',
    state: 'Estado actual: Disponible, Ocupado, en Mantenimiento o Restringido.',
    foodType: 'Tipo de alimento o pasto disponible en este potrero.',
  },
  // Tratamientos
  treatment: {
    diagnosis: 'Diagnóstico o motivo del tratamiento.',
    treatmentDate: 'Fecha en que se inició el tratamiento.',
    veterinarian: 'Nombre del veterinario que realizó el tratamiento.',
    symptoms: 'Síntomas observados en el animal.',
    treatmentPlan: 'Plan de tratamiento detallado.',
    followUpDate: 'Fecha programada para seguimiento o revisión.',
    cost: 'Costo del tratamiento en pesos.',
    status: 'Estado del tratamiento: Iniciado, En progreso, Completado o Suspendido.',
  },
  // Vacunaciones
  vaccination: {
    vaccinationDate: 'Fecha en que se aplicó la vacuna.',
    dose: 'Dosis aplicada. Ejemplo: 2ml, primera dosis.',
    batchNumber: 'Número de lote de la vacuna para trazabilidad.',
    expiryDate: 'Fecha de vencimiento del lote de vacuna.',
    veterinarian: 'Nombre de quien aplicó la vacuna.',
    nextVaccinationDate: 'Fecha programada para la próxima dosis o refuerzo.',
    adverseReactions: 'Reacciones adversas observadas después de la vacunación.',
  },
  // Controles
  control: {
    checkupDate: 'Fecha del chequeo o control.',
    healthStatus: 'Estado de salud general del animal.',
    description: 'Descripción detallada del control realizado.',
    weight: 'Peso registrado durante el control.',
    temperature: 'Temperatura corporal en grados Celsius.',
  },
};
