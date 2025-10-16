import React, { useState, useEffect } from 'react';
import { MoreVertical, Beef, Plus, Eye } from 'lucide-react';
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

// Importar servicios
import { animalFieldsService } from '@/services/animalFieldsService';
import { animalsService } from '@/services/animalService';

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

  // Opciones para los selects
  const [animalOptions, setAnimalOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Cargar opciones cuando se abre un modal de creación
  useEffect(() => {
    if (openModal && modalMode === 'create') {
      loadOptions();
    }
  }, [openModal, modalMode]);

  // Cargar lista cuando se abre un modal de lista
  useEffect(() => {
    if (openModal && modalMode === 'list') {
      loadListData();
    }
  }, [openModal, modalMode, field.id]);

  const loadOptions = async () => {
    try {
      const animals = await animalsService.getAnimals({ page: 1, limit: 1000 }).catch(() => []);

      const animalsData = animals || [];
      setAnimalOptions(animalsData.map((a: any) => ({
        value: a.id,
        label: a.record || `Animal ${a.id}`
      })));
    } catch (err) {
      console.error('Error loading options:', err);
    }
  };

  const loadListData = async () => {
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
  };

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
      alert('Registro creado exitosamente');
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

    return (
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
    </>
  );
};
