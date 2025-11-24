import React, { useState, useEffect, useCallback } from 'react';
import { MoreVertical, Beef, Plus, Eye, LogOut, MoveRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { GenericModal } from '@/components/common/GenericModal';
import { FieldResponse } from '@/types/swaggerTypes';
import { getTodayColombia } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';

// Importar servicios
import { animalFieldsService } from '@/services/animalFieldsService';
import { animalsService } from '@/services/animalService';
import { fieldService } from '@/services/fieldService';

interface FieldActionsMenuProps {
  field: FieldResponse;
}

type ModalType = 'animals' | null;
type ModalMode = 'create' | 'list';

export const FieldActionsMenu: React.FC<FieldActionsMenuProps> = ({ field }) => {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Estados para acciones de animales
  const [selectedAnimalField, setSelectedAnimalField] = useState<any>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetFieldId, setTargetFieldId] = useState<number | undefined>(undefined);

  // Opciones para los selects
  const [animalOptions, setAnimalOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [fieldOptions, setFieldOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Cargar opciones cuando se abre un modal de creación
  useEffect(() => {
    if (openModal && modalMode === 'create') {
      loadOptions();
    }
  }, [openModal, modalMode, loadOptions]);

  // Cargar lista cuando se abre un modal de lista
  useEffect(() => {
    if (openModal && modalMode === 'list') {
      loadListData();
    }
  }, [openModal, modalMode, field.id, loadListData]);

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

  const loadListData = useCallback(async () => {
    setLoadingList(true);
    try {
      let data: any[] = [];

      const afResult = await (animalFieldsService as any).getAll?.({
        field_id: field.id,
        limit: 100
      });
      data = Array.isArray(afResult) ? afResult : (afResult?.data || afResult?.items || []);
      data = data.filter((item: any) => item.field_id === field.id);

      setListData(data);
    } catch (err: any) {
      console.error('Error loading list data:', err);
      setError('Error al cargar los registros');
    } finally {
      setLoadingList(false);
    }
  }, [field.id]);

  const handleOpenModal = (type: ModalType, mode: ModalMode) => {
    setOpenModal(type);
    setModalMode(mode);
    setError(null);
    setListData([]);

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
    setListData([]);
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
      // Recargar la lista si estamos en modo lista
      if (modalMode === 'list') {
        loadListData();
      }
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
      loadListData(); // Recargar la lista
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
      loadListData(); // Recargar la lista
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Error al mover el animal');
    } finally {
      setLoading(false);
    }
  };

  const renderListContent = () => {
    if (loadingList) {
      return (
        <div className="py-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando registros...</p>
        </div>
      );
    }

    if (listData.length === 0) {
      return (
        <div className="py-10 text-center">
          <p className="text-muted-foreground">No hay animales asignados a este potrero</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {listData.map((item, index) => (
          <div
            key={item.id || index}
            className="border border-border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            {renderListItem(item)}
          </div>
        ))}
      </div>
    );
  };

  const renderListItem = (item: any) => {
    const getAnimalLabel = (animalId: number) => {
      const animal = animalOptions.find(a => a.value === animalId);
      return animal?.label || `Animal ${animalId}`;
    };

    const isActive = !item.removal_date; // Animal activo si no tiene fecha de retiro

    return (
      <div className="space-y-3">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="font-medium text-foreground">Animal:</span>
            <span className="text-muted-foreground">{item.animal_id ? getAnimalLabel(item.animal_id) : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-foreground">Asignación:</span>
            <span className="text-muted-foreground">
              {item.assignment_date ? new Date(item.assignment_date).toLocaleDateString('es-ES') : '-'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-foreground">Retiro:</span>
            <span className="text-muted-foreground">
              {item.removal_date ? new Date(item.removal_date).toLocaleDateString('es-ES') : 'Actualmente asignado'}
            </span>
          </div>
          {item.notes && (
            <div>
              <span className="font-medium text-foreground">Notas:</span>
              <p className="text-muted-foreground mt-1">{item.notes}</p>
            </div>
          )}
        </div>

        {/* Botones de acción - solo para animales activos */}
        {isActive && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setSelectedAnimalField(item);
                setShowMoveModal(true);
                loadOptions(); // Cargar opciones de potreros
              }}
            >
              <MoveRight className="h-3.5 w-3.5 mr-1.5" />
              Mover a otro potrero
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setSelectedAnimalField(item);
                setShowRemoveConfirm(true);
              }}
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Retirar del potrero
            </Button>
          </div>
        )}
      </div>
    );
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
    return modalMode === 'create' ? 'Asignar Animal al Potrero' : `Animales en ${field.name || 'Potrero'}`;
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
                  handleOpenModal('animals', 'list');
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
        isOpen={openModal !== null}
        onOpenChange={(open) => !open && handleCloseModal()}
        title={getModalTitle()}
        description={modalMode === 'list' ? `Listado de animales asignados` : undefined}
        size="2xl"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        <div className="space-y-4">
          {modalMode === 'list' ? (
            renderListContent()
          ) : (
            <>
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
            </>
          )}
        </div>
      </GenericModal>

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
