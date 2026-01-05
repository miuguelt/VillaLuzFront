import React, { useState, useEffect, useCallback } from 'react';
import { MoreVertical, Beef, Plus, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/shared/ui/dropdown-menu';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { FieldResponse } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { Button } from '@/shared/ui/button';
import { FieldAnimalsModal } from '@/widgets/dashboard/fields/FieldAnimalsModal';

// Importar servicios
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';

interface FieldActionsMenuProps {
  field: FieldResponse;
}

type ModalType = 'animals' | 'view_animals' | null;
type ModalMode = 'create' | 'list';

export const FieldActionsMenu: React.FC<FieldActionsMenuProps> = ({ field }) => {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para acciones de animales
  const [selectedAnimalField, setSelectedAnimalField] = useState<any>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetFieldId, setTargetFieldId] = useState<number | undefined>(undefined);

  // Opciones para los selects
  const [animalOptions, setAnimalOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [fieldOptions, setFieldOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Cargar opciones
  const loadOptions = useCallback(async () => {
    try {
      const animals = await animalsService.getAnimals({ page: 1, limit: 1000 }).catch(() => []);
      const animalsData = animals || [];
      setAnimalOptions(animalsData.map((a: any) => ({
        value: a.id,
        label: a.record || `Animal ${a.id}`
      })));

      // Cargar potreros para la funcionalidad de mover
      const fields = await fieldService.getFields({ page: 1, limit: 1000 }).catch(() => ({ data: [] }));
      const fieldsData = Array.isArray(fields) ? fields : (fields?.data || []);
      setFieldOptions(fieldsData
        .filter((f: any) => f.id !== field.id) // Excluir el potrero actual
        .map((f: any) => ({
          value: f.id,
          label: f.name || `Potrero ${f.id}`
        }))
      );
    } catch (err) {
      console.error('Error loading options:', err);
    }
  }, [field.id]);

  // Cargar opciones cuando se abre un modal de creación
  useEffect(() => {
    if (openModal === 'animals' && modalMode === 'create') {
      loadOptions();
    }
  }, [openModal, modalMode, loadOptions]);

  const handleOpenModal = (type: ModalType, mode: ModalMode) => {
    setOpenModal(type);
    setModalMode(mode);
    setError(null);

    if (mode === 'create') {
      setFormData({
        animal_id: undefined,
        field_id: field.id,
        assignment_date: getTodayColombia(),
        removal_date: undefined,
        notes: '',
      });
    }
  };

  const handleCloseModal = () => {
    setOpenModal(null);
    setFormData({});
    setError(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!formData.animal_id || !formData.field_id) {
        throw new Error('Animal y campo son obligatorios');
      }
      await animalFieldsService.createAnimalField(formData);
      handleCloseModal();
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAnimal = async () => {
    if (!selectedAnimalField) return;

    setLoading(true);
    try {
      // Actualizar el registro con la fecha de retiro
      await animalFieldsService.updateAnimalField(selectedAnimalField.id, {
        ...selectedAnimalField,
        removal_date: getTodayColombia()
      });

      alert('Animal retirado del potrero exitosamente');
      setShowRemoveConfirm(false);
      setSelectedAnimalField(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Error al retirar el animal');
    } finally {
      setLoading(false);
    }
  };

  const handleMoveAnimal = async () => {
    if (!selectedAnimalField || !targetFieldId) {
      alert('Debe seleccionar un potrero de destino');
      return;
    }

    setLoading(true);
    try {
      // 1. Marcar como retirado del potrero actual
      await animalFieldsService.updateAnimalField(selectedAnimalField.id, {
        ...selectedAnimalField,
        removal_date: getTodayColombia()
      });

      // 2. Crear nuevo registro en el potrero destino
      await animalFieldsService.createAnimalField({
        animal_id: selectedAnimalField.animal_id,
        field_id: targetFieldId,
        assignment_date: getTodayColombia(),
        notes: `Movido desde ${field.name || `Potrero ${field.id}`}`
      });

      alert('Animal movido exitosamente');
      setShowMoveModal(false);
      setSelectedAnimalField(null);
      setTargetFieldId(undefined);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Error al mover el animal');
    } finally {
      setLoading(false);
    }
  };

  const renderFormContent = () => {
    const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
    const labelClass = "block text-sm font-medium mb-1.5 text-foreground";
    const selectClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

    return (
      <div className="space-y-4">
        <div>
          <label className={labelClass}>Potrero</label>
          <input
            type="text"
            value={field.name || `ID ${field.id}`}
            disabled
            className={`${inputClass} bg-muted/50`}
          />
        </div>
        <div>
          <label className={labelClass}>Animal *</label>
          <select
            value={formData.animal_id || ''}
            onChange={(e) => setFormData({ ...formData, animal_id: parseInt(e.target.value) })}
            className={selectClass}
          >
            <option value="">Seleccionar animal</option>
            {animalOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Fecha de Asignación *</label>
          <input
            type="date"
            value={formData.assignment_date || ''}
            onChange={(e) => setFormData({ ...formData, assignment_date: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Fecha de Retiro</label>
          <input
            type="date"
            value={formData.removal_date || ''}
            onChange={(e) => setFormData({ ...formData, removal_date: e.target.value })}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Notas</label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Observaciones adicionales"
            rows={3}
            className={inputClass}
          />
        </div>
      </div>
    );
  };

  const getModalTitle = () => {
    return 'Asignar Animal al Potrero';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="icon-btn p-1.5 hover:bg-accent rounded-md transition-colors"
            onClick={(e) => e.stopPropagation()}
            title="Más acciones"
            aria-label="Más acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Beef className="mr-2 h-4 w-4" />
              Animales
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animals', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Asignar Animal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenModal('view_animals');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Animales
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <GenericModal
        isOpen={openModal === 'animals'}
        onOpenChange={(open) => !open && handleCloseModal()}
        title={getModalTitle()}
        size="2xl"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        <div className="space-y-4">
          {renderFormContent()}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={handleCloseModal}
              className="px-4 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </GenericModal>

      {/* Modal para ver animales */}
      <FieldAnimalsModal
        field={field}
        isOpen={openModal === 'view_animals'}
        onClose={() => setOpenModal(null)}
      />

      {/* Modal de confirmación para retirar animal */}
      <GenericModal
        isOpen={showRemoveConfirm}
        onOpenChange={setShowRemoveConfirm}
        title="Retirar Animal del Potrero"
        description="¿Está seguro que desea retirar este animal del potrero?"
        size="md"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              Esta acción marcará el animal como retirado del potrero con la fecha de hoy.
              El animal ya no contará en la ocupación del potrero.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveConfirm(false);
                setSelectedAnimalField(null);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveAnimal}
              disabled={loading}
            >
              {loading ? 'Retirando...' : 'Retirar Animal'}
            </Button>
          </div>
        </div>
      </GenericModal>

      {/* Modal para mover animal a otro potrero */}
      <GenericModal
        isOpen={showMoveModal}
        onOpenChange={setShowMoveModal}
        title="Mover Animal a Otro Potrero"
        description="Seleccione el potrero de destino"
        size="md"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Potrero de Destino *
            </label>
            <select
              value={targetFieldId || ''}
              onChange={(e) => setTargetFieldId(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Seleccionar potrero</option>
              {fieldOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground">
              Esta acción retirará el animal del potrero actual y lo asignará automáticamente
              al potrero seleccionado con la fecha de hoy.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowMoveModal(false);
                setSelectedAnimalField(null);
                setTargetFieldId(undefined);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleMoveAnimal}
              disabled={loading || !targetFieldId}
            >
              {loading ? 'Moviendo...' : 'Mover Animal'}
            </Button>
          </div>
        </div>
      </GenericModal>
    </>
  );
};
