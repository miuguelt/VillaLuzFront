import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { MoreVertical, Dna, Activity, Syringe, Pill, MapPin, ClipboardList, Eye, Plus, History, GitBranch, Baby, Edit2, Trash2, X, PlusCircle, Trash, Save, AlertCircle, XCircle } from 'lucide-react';
import { useToast } from '@/app/providers/ToastContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/shared/ui/dropdown-menu';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { InfoField } from '@/shared/ui/common/ModalStyles';
import { resolveRecordId } from '@/shared/utils/recordIdUtils';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalResponse } from '@/shared/api/generated/swaggerTypes';

// Importar servicios
import { geneticImprovementsService } from '@/entities/genetic-improvement/api/geneticImprovements.service';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { controlService } from '@/entities/control/api/control.service';
// Importar servicio de caché de dependencias y verificación
import { clearAnimalDependencyCache, checkTreatmentDependencies } from '@/features/diagnostics/api/dependencyCheck.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { fieldService } from '@/entities/field/api/field.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { usersService } from '@/entities/user/api/user.service';
import { TreatmentSuppliesModal } from '@/widgets/dashboard/treatments/TreatmentSuppliesModal';
import { ItemDetailModal } from './animals/ItemDetailModal';
import { ApiFetchError } from '@/shared/api/apiFetch';

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  try {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

interface AnimalActionsMenuProps {
  animal: AnimalResponse;
  currentUserId?: number;
  onOpenHistory?: () => void;
  onOpenAncestorsTree?: () => void;
  onOpenDescendantsTree?: () => void;
  onRefresh?: (type?: string) => void;
  externalOpenModal?: ModalType;
  externalModalMode?: ModalMode;
  externalEditingItem?: any;
  onModalClose?: () => void;
}

type ModalType =
  | 'genetic_improvement'
  | 'animal_disease'
  | 'animal_field'
  | 'vaccination'
  | 'treatment'
  | 'control'
  | null;

type ModalMode = 'create' | 'list' | 'view' | 'edit';

interface ModalState {
  id: string;
  type: ModalType;
  mode: ModalMode;
  editingItem: any | null;
}

export const AnimalActionsMenu: React.FC<AnimalActionsMenuProps> = ({
  animal,
  currentUserId,
  onOpenHistory,
  onOpenAncestorsTree,
  onOpenDescendantsTree,
  onRefresh,
  externalOpenModal,
  externalModalMode,
  externalEditingItem,
  onModalClose
}) => {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);

  // Opciones para los selects
  const [diseaseOptions, setDiseaseOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [fieldOptions, setFieldOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [vaccineOptions, setVaccineOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [userOptions, setUserOptions] = useState<Array<{ value: number; label: string }>>([]);

  const loadOptions = useCallback(async () => {
    try {
      const [diseases, fields, vaccines, users] = await Promise.all([
        diseaseService.getDiseases({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
        fieldService.getFields({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
        vaccinesService.getVaccines?.({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
        usersService.getUsers({ page: 1, limit: 1000 }).catch(() => ({ data: [] })),
      ]);

      const diseasesData = (diseases as any)?.data || diseases || [];
      setDiseaseOptions(diseasesData.map((d: any) => ({
        value: d.id,
        label: d.disease || d.name || d.label || `Enfermedad ${d.id}`
      })));

      const fieldsData = (fields as any)?.data || fields || [];
      setFieldOptions(fieldsData.map((f: any) => ({
        value: f.id,
        label: f.name || f.label || `Campo ${f.id}`
      })));

      const vaccinesData = (vaccines as any)?.data || vaccines || [];
      setVaccineOptions(vaccinesData.map((v: any) => ({
        value: v.id,
        label: v.name || v.label || `Vacuna ${v.id}`
      })));

      const usersData = (users as any)?.data || users || [];
      setUserOptions(usersData.map((u: any) => ({
        value: u.id,
        label: u.fullname || u.name || u.label || `Usuario ${u.id}`
      })));
    } catch (err) {
      console.error('[AnimalActionsMenu] Error loading options:', err);
    }
  }, []);

  const handleOpenModal = useCallback((type: ModalType, mode: ModalMode, item: any = null) => {
    const newModal: ModalState = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      mode: mode === 'edit' ? 'create' : mode,
      editingItem: item,
    };
    setModalStack((prev) => [...prev, newModal]);
  }, []);

  // Sincronizar con props externos
  useEffect(() => {
    if (externalOpenModal) {
      setModalStack((prev) => {
        const top = prev[prev.length - 1];
        if (top?.type === externalOpenModal && top?.mode === externalModalMode) return prev;

        return [...prev, {
          id: Math.random().toString(36).substring(2, 9),
          type: externalOpenModal,
          mode: externalModalMode === 'edit' ? 'create' : (externalModalMode || 'create'),
          editingItem: externalEditingItem,
        }];
      });
    }
  }, [externalOpenModal, externalModalMode, externalEditingItem]);

  const handleCloseModal = useCallback((id?: string) => {
    setModalStack((prev) => {
      const newStack = id ? prev.filter((m) => m.id !== id) : prev.slice(0, -1);
      if (newStack.length === 0 && onModalClose) {
        onModalClose();
      }
      return newStack;
    });
  }, [onModalClose]);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            className="icon-btn p-1.5 hover:bg-accent rounded-md transition-colors"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            title="Más acciones"
            aria-label="Más acciones"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory?.();
            }}
            className="cursor-pointer"
          >
            <History className="mr-2 h-4 w-4" />
            Historial
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenAncestorsTree?.();
            }}
            className="cursor-pointer"
          >
            <GitBranch className="mr-2 h-4 w-4" />
            Árbol de Antepasados
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onOpenDescendantsTree?.();
            }}
            className="cursor-pointer"
          >
            <Baby className="mr-2 h-4 w-4" />
            Árbol de Descendientes
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Dna className="mr-2 h-4 w-4" />
              Mejora Genética
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('genetic_improvement', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('genetic_improvement', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Activity className="mr-2 h-4 w-4" />
              Enfermedad
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animal_disease', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animal_disease', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <MapPin className="mr-2 h-4 w-4" />
              Asignar Campo
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animal_field', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('animal_field', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Syringe className="mr-2 h-4 w-4" />
              Vacunación
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('vaccination', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('vaccination', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Pill className="mr-2 h-4 w-4" />
              Tratamiento
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('treatment', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('treatment', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ClipboardList className="mr-2 h-4 w-4" />
              Control
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('control', 'create');
                }}
                className="cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                Insertar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenModal('control', 'list');
                }}
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4" />
                Ver Lista
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      {modalStack.map((modalState, index) => (
        <AnimalActionModalInstance
          key={modalState.id}
          type={modalState.type}
          mode={modalState.mode}
          animal={animal}
          currentUserId={currentUserId}
          editingItem={modalState.editingItem}
          zIndex={1000 + index * 10}
          onClose={() => handleCloseModal(modalState.id)}
          onRefreshParent={onRefresh}
          diseaseOptions={diseaseOptions}
          fieldOptions={fieldOptions}
          vaccineOptions={vaccineOptions}
          userOptions={userOptions}
          loadOptions={loadOptions}
        />
      ))}
    </>
  );
};

interface AnimalActionModalInstanceProps {
  type: ModalType;
  mode: ModalMode;
  animal: AnimalResponse;
  currentUserId?: number;
  editingItem: any | null;
  zIndex: number;
  onClose: () => void;
  onRefreshParent?: (type?: string) => void;
  diseaseOptions: any[];
  fieldOptions: any[];
  vaccineOptions: any[];
  userOptions: any[];
  loadOptions: () => Promise<void>;
}

const AnimalActionModalInstance: React.FC<AnimalActionModalInstanceProps> = ({
  type,
  mode,
  animal,
  currentUserId,
  editingItem: initialEditingItem,
  onClose,
  onRefreshParent,
  diseaseOptions,
  fieldOptions,
  vaccineOptions,
  userOptions,
  loadOptions,
  zIndex
}) => {
  const { showToast } = useToast();
  const [modalMode, setModalMode] = useState<ModalMode>(mode === 'edit' ? 'create' : mode);
  const [editingItem, setEditingItem] = useState<any | null>(initialEditingItem);
  const [formData, setFormData] = useState<any>(initialEditingItem || {});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [pendingBulkItems, setPendingBulkItems] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [deletingItemId, setDeletingItemId] = useState<string | number | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | number | null>(null);
  const modalStateId = useMemo(() => Math.random().toString(36).substring(2, 9), []);

  // Convertir opciones a mapas para ItemDetailModal
  const diseaseOptionsMap = useMemo(() => {
    const map: Record<number, string> = {};
    diseaseOptions.forEach(o => map[o.value] = o.label);
    return map;
  }, [diseaseOptions]);

  const fieldOptionsMap = useMemo(() => {
    const map: Record<number, string> = {};
    fieldOptions.forEach(o => map[o.value] = o.label);
    return map;
  }, [fieldOptions]);

  const vaccineOptionsMap = useMemo(() => {
    const map: Record<number, string> = {};
    vaccineOptions.forEach(o => map[o.value] = o.label);
    return map;
  }, [vaccineOptions]);

  const userOptionsMap = useMemo(() => {
    const map: Record<number, string> = {};
    userOptions.forEach(o => map[o.value] = o.label);
    return map;
  }, [userOptions]);

  // Estado para modal de insumos (tratamientos)
  const [suppliesModalOpen, setSuppliesModalOpen] = useState(false);
  const [selectedTreatmentForSupplies, setSelectedTreatmentForSupplies] = useState<any>(null);

  const loadListData = useCallback(async (forceRefresh = false) => {
    setLoadingList(true);
    try {
      let data: any[] = [];
      const filterById = (items: any) => {
        const arr = Array.isArray(items) ? items : (items?.data || items?.items || []);
        return arr.filter((item: any) => String(item.animal_id || item.animalId) === String(animal.id));
      };

      const params = { animal_id: animal.id, limit: 100, cache_bust: forceRefresh ? Date.now() : undefined } as any;

      switch (type) {
        case 'genetic_improvement':
          data = filterById(await geneticImprovementsService.getGeneticImprovements(params));
          break;
        case 'animal_disease':
          data = filterById(await animalDiseasesService.getAnimalDiseases(params));
          break;
        case 'animal_field':
          data = filterById(await animalFieldsService.getAnimalFields(params));
          break;
        case 'vaccination':
          data = filterById(await vaccinationsService.getVaccinations(params));
          break;
        case 'treatment':
          data = filterById(await treatmentsService.getTreatments(params));
          break;
        case 'control':
          data = filterById(await controlService.getControls(params));
          break;
      }
      setListData(data);
    } catch (err: any) {
      console.error('[AnimalActionModalInstance] Error loading list data:', err);
      setError('Error al cargar los registros');
    } finally {
      setLoadingList(false);
    }
  }, [animal.id, type]);

  useEffect(() => {
    if (modalMode === 'create' && !editingItem) {
      const today = getTodayColombia();
      switch (type) {
        case 'genetic_improvement':
          setFormData({ animal_id: animal.id, date: today, genetic_event_technique: '', details: '', results: '' });
          break;
        case 'animal_disease':
          setFormData({ animal_id: animal.id, disease_id: undefined, instructor_id: currentUserId, diagnosis_date: today, status: 'Activo', notes: '' });
          break;
        case 'animal_field':
          setFormData({ animal_id: animal.id, field_id: undefined, assignment_date: today, removal_date: undefined, notes: '' });
          break;
        case 'vaccination':
          setFormData({ animal_id: animal.id, vaccine_id: undefined, vaccination_date: today, instructor_id: currentUserId, apprentice_id: undefined });
          break;
        case 'treatment':
          setFormData({ animal_id: animal.id, treatment_date: today, description: '', dosis: '', frequency: '', observations: '' });
          break;
        case 'control':
          setFormData({ animal_id: animal.id, checkup_date: today, weight: undefined, height: undefined, health_status: 'Sano', description: '' });
          break;
      }
    }
  }, [type, modalMode, animal.id, currentUserId, editingItem]);

  useEffect(() => {
    if (modalMode === 'create') {
      loadOptions();
    } else if (modalMode === 'list') {
      loadListData();
    }
  }, [modalMode, loadOptions, loadListData]);

  const handleSubmit = async (stayInCreateMode: boolean = false) => {
    setLoading(true);
    setError(null);
    try {
      const isEditing = !!editingItem;
      const targetId = isEditing ? resolveRecordId(editingItem) : null;
      if (isEditing && !targetId) {
        throw new Error('Error interno: No se pudo identificar el registro a actualizar (ID desconocido).');
      }

      const dataToSend = {
        ...formData,
        animal_id: animal.id,
        animalId: animal.id // Redundancia para consistencia
      };

      if (type === 'genetic_improvement' && (!dataToSend.date || !dataToSend.genetic_event_technique?.trim())) throw new Error('Complete los campos obligatorios.');
      if (type === 'animal_disease' && (!dataToSend.disease_id || !dataToSend.diagnosis_date)) throw new Error('Complete los campos obligatorios.');
      if (type === 'animal_field' && (!dataToSend.field_id || !dataToSend.assignment_date)) throw new Error('Complete los campos obligatorios.');
      if (type === 'vaccination' && (!dataToSend.vaccine_id || !dataToSend.vaccination_date)) throw new Error('Complete los campos obligatorios.');
      if (type === 'treatment' && (!dataToSend.treatment_date || !dataToSend.description?.trim())) throw new Error('Complete los campos obligatorios.');
      if (type === 'control' && (!dataToSend.checkup_date || !dataToSend.health_status)) throw new Error('Complete los campos obligatorios.');

      switch (type) {
        case 'genetic_improvement':
          if (isEditing) await geneticImprovementsService.updateGeneticImprovement(targetId as any, dataToSend);
          else await geneticImprovementsService.createGeneticImprovement(dataToSend);
          break;
        case 'animal_disease':
          if (isEditing) await animalDiseasesService.updateAnimalDisease(targetId as any, dataToSend);
          else await animalDiseasesService.createAnimalDisease(dataToSend);
          break;
        case 'animal_field':
          if (isEditing) await animalFieldsService.updateAnimalField(targetId as any, dataToSend);
          else await animalFieldsService.createAnimalField(dataToSend);
          break;
        case 'vaccination':
          if (isEditing) await vaccinationsService.updateVaccination(targetId as any, dataToSend);
          else await vaccinationsService.createVaccination(dataToSend);
          break;
        case 'treatment':
          if (isEditing) await treatmentsService.updateTreatment(targetId as any, dataToSend);
          else await treatmentsService.createTreatment(dataToSend);
          break;
        case 'control':
          if (isEditing) {
            await controlService.updateControl(targetId as any, dataToSend);
          } else {
            if (pendingBulkItems.length > 0) {
              const allItems = [...pendingBulkItems.map(item => ({ ...item, animal_id: animal.id, animalId: animal.id })), dataToSend];
              await controlService.createBulk(allItems);
            } else {
              await controlService.createControl(dataToSend);
            }
          }
          break;
      }

      setPendingBulkItems([]);

      if (stayInCreateMode && !isEditing) {
        const prevDate = dataToSend.checkup_date || dataToSend.date || dataToSend.vaccination_date || dataToSend.treatment_date || dataToSend.diagnosis_date || dataToSend.assignment_date;
        const baseReset = { animal_id: animal.id };
        if (type === 'control') {
          setFormData({ ...baseReset, checkup_date: prevDate, health_status: 'Sano', weight: '', height: '', description: '' });
        } else if (type === 'vaccination') {
          setFormData({ ...baseReset, vaccination_date: prevDate, vaccine_id: '', instructor_id: currentUserId });
        } else if (type === 'treatment') {
          setFormData({ ...baseReset, treatment_date: prevDate, description: '', dosis: '', frequency: '', observations: '' });
        } else {
          setFormData({ ...baseReset });
        }
        showToast('Registro guardado exitosamente. Puede continuar agregando.', 'success');
      } else {
        setModalMode('list');
        setEditingItem(null);
        showToast(isEditing ? 'Registro actualizado correctamente' : 'Registro creado correctamente', 'success');
      }

      // Programar refresco con delay para consistencia del backend
      setTimeout(async () => {
        await loadListData(true);
        onRefreshParent?.(type || undefined);
      }, 1200);
    } catch (err: any) {
      console.error('[AnimalActionModalInstance] Error saving:', err);
      let msg = err?.response?.data?.message || err.message || 'Error al guardar';
      setValidationErrors(null);

      // Si es un error de validación con detalles, guardarlos en estado para mostrarlos bonito
      if (err instanceof ApiFetchError && err.validationErrors) {
        setValidationErrors(err.validationErrors);
        msg = 'Por favor, corrige los siguientes errores:';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setModalMode('create');
  };

  // Función para iniciar confirmación de eliminación (primer clic)
  const handleDeleteClick = (item: any) => {
    const itemId = resolveRecordId(item);
    console.log('[handleDeleteClick] First click for itemId:', itemId);

    if (!itemId) {
      showToast('No se pudo determinar el ID del registro', 'error');
      return;
    }

    // Si ya está en modo confirmación para este item, ejecutar eliminación
    if (confirmingDeleteId === itemId) {
      handleDeleteConfirm(item);
    } else {
      // Activar modo confirmación para este item
      setConfirmingDeleteId(itemId);
      showToast('Haz clic de nuevo para confirmar la eliminación', 'warning');

      // Auto-cancelar confirmación después de 3 segundos
      setTimeout(() => {
        setConfirmingDeleteId((current) => current === itemId ? null : current);
      }, 3000);
    }
  };

  // Función para ejecutar la eliminación (segundo clic o confirmación)
  const handleDeleteConfirm = async (item: any) => {
    const itemId = resolveRecordId(item);
    console.log('[handleDeleteConfirm] Executing delete for itemId:', itemId, 'type:', type);

    if (!itemId) {
      showToast('No se pudo determinar el ID del registro para eliminar', 'error');
      return;
    }

    // Prevenir doble eliminación - verificar si ya se está eliminando este item
    if (deletingItemId === itemId) {
      console.log('[handleDeleteConfirm] Already deleting this item, ignoring');
      return;
    }

    setConfirmingDeleteId(null);
    setDeletingItemId(itemId);

    try {
      console.log('[handleDeleteConfirm] Calling delete service for type:', type);

      // Para tratamientos, verificar dependencias ANTES de intentar eliminar
      if (type === 'treatment') {
        console.log('[handleDeleteConfirm] Checking treatment dependencies first...');
        const depCheck = await checkTreatmentDependencies(itemId as number);

        if (depCheck.hasDependencies) {
          console.log('[handleDeleteConfirm] Treatment has dependencies, blocking delete');

          // Construir mensaje detallado de dependencias
          const depList = depCheck.dependencies?.map(d => `• ${d.entity}: ${d.count}`).join('\n') || '';
          const detailedMsg = depCheck.detailedMessage || depCheck.message || 'Este tratamiento tiene dependencias.';

          showToast(
            `No se puede eliminar: ${depCheck.dependencies?.map(d => `${d.count} ${d.entity}`).join(', ') || 'tiene dependencias'}. Elimínalas primero.`,
            'error'
          );

          // También log detallado para debugging
          console.warn('[handleDeleteConfirm] Treatment dependencies:', {
            treatmentId: itemId,
            dependencies: depCheck.dependencies,
            message: depCheck.message
          });

          setDeletingItemId(null);
          return;
        }
      }

      switch (type) {
        case 'genetic_improvement': await geneticImprovementsService.deleteGeneticImprovement(itemId as any); break;
        case 'animal_disease': await animalDiseasesService.deleteAnimalDisease(itemId as any); break;
        case 'animal_field': await animalFieldsService.deleteAnimalField(itemId as any); break;
        case 'vaccination': await vaccinationsService.deleteVaccination(itemId as any); break;
        case 'treatment': await treatmentsService.deleteTreatment(itemId as any); break;
        case 'control': await controlService.deleteControl(itemId as any); break;
      }
      console.log('[handleDeleteConfirm] Delete successful, removing item from list');

      // Remover item de la lista local inmediatamente para mejor UX
      // Usar String() para asegurar comparación correcta de tipos
      const deletedId = String(itemId);
      setListData(prev => {
        const newList = prev.filter(i => String(resolveRecordId(i)) !== deletedId);
        console.log('[handleDeleteConfirm] List filtered:', prev.length, '->', newList.length);
        return newList;
      });

      showToast('Registro eliminado correctamente', 'success');

      // NO llamar loadListData() aquí - ya actualizamos la lista localmente
      // Esto evita que datos cacheados sobrescriban nuestro estado actualizado

      // Limpiar caché de dependencias del animal para que se refleje inmediatamente la eliminación
      if (animal?.id) {
        console.log('[handleDeleteConfirm] Clearing dependency cache for animal:', animal.id);
        clearAnimalDependencyCache(animal.id);
      }

      // Limpiar caché específica del servicio según el tipo
      switch (type) {
        case 'genetic_improvement': geneticImprovementsService.clearCache(); break;
        case 'animal_disease': animalDiseasesService.clearCache(); break;
        case 'animal_field': animalFieldsService.clearCache(); break;
        case 'vaccination': vaccinationsService.clearCache(); break;
        case 'treatment': treatmentsService.clearCache(); break;
        case 'control': controlService.clearCache(); break;
      }

      // Programar refresco con delay para consistencia del backend
      setTimeout(() => {
        onRefreshParent?.(type || undefined);
      }, 300);
    } catch (err: any) {
      console.error('[AnimalActionsMenu] Error al eliminar:', err);

      // ApiFetchError expone status y message directamente, o en original.response
      const errorStatus = err.status ?? err.response?.status;
      const errorMessage = err.message || err.response?.data?.message || 'Error desconocido';

      console.log('[AnimalActionsMenu] Error details - status:', errorStatus, 'message:', errorMessage);

      const deletedId = String(itemId);

      // Detectar si es error 404 (no encontrado) - ya sea por status o por mensaje
      const isNotFound =
        errorStatus === 404 ||
        String(errorMessage).toLowerCase().includes('no encontrado') ||
        String(errorMessage).toLowerCase().includes('not found');

      if (isNotFound) {
        showToast('El registro ya fue eliminado', 'info');
        // Remover de la lista local ya que no existe en el servidor
        setListData(prev => {
          const newList = prev.filter(i => String(resolveRecordId(i)) !== deletedId);
          console.log('[handleDeleteConfirm] Removed from list after 404:', prev.length, '->', newList.length);
          return newList;
        });

        // También limpiar caché de dependencias si fue un 404, para sincronizar estado
        if (animal?.id) {
          clearAnimalDependencyCache(animal.id);
        }
      } else {
        showToast('Error al eliminar: ' + errorMessage, 'error');
      }
    } finally {
      setDeletingItemId(null);
    }
  };

  // Mantener handleDelete como alias para compatibilidad
  const handleDelete = handleDeleteClick;

  const getModalTitle = useCallback(() => {
    const modeText = modalMode === 'create' ? (editingItem ? 'Editar' : 'Registrar') : 'Historial de';
    const typeLabel = { genetic_improvement: 'Mejora Genética', animal_disease: 'Enfermedad', animal_field: 'Asignación de Campo', vaccination: 'Vacunación', treatment: 'Tratamiento', control: 'Control' }[type as string] || 'Acción';
    return `${modeText} ${typeLabel} - Animal #${animal.record || animal.id}`;
  }, [modalMode, editingItem, type, animal.record, animal.id]);

  const renderListContent = () => {
    if (loadingList) return <div className="py-10 text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div><p>Cargando registros...</p></div>;
    if (listData.length === 0) return (
      <div className="py-10 text-center bg-muted/5 rounded-2xl border-2 border-dashed border-border/40">
        <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/20 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">No se encontraron registros</p>
        <button onClick={() => setModalMode('create')} className="mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-white shadow-sm hover:opacity-90 active:scale-95 transition-all">Crear el primero</button>
      </div>
    );

    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
        {listData.map((item, index) => {
          // Determinar color de borde según tipo y estado
          const getBorderColor = () => {
            if (type === 'control') {
              const status = item.health_status;
              if (status === 'Excelente' || status === 'Bueno' || status === 'Sano') return 'border-l-green-500';
              if (status === 'Regular') return 'border-l-amber-500';
              return 'border-l-rose-500';
            }
            if (type === 'vaccination') return 'border-l-blue-500';
            if (type === 'treatment') return 'border-l-purple-500';
            if (type === 'animal_disease') return 'border-l-rose-500';
            if (type === 'animal_field') return 'border-l-amber-500';
            if (type === 'genetic_improvement') return 'border-l-emerald-500';
            return 'border-l-primary';
          };

          return (
            <div
              key={item.id || index}
              onClick={() => {
                setEditingItem(item);
                setModalMode('view');
              }}
              className={`relative bg-card border border-border/60 rounded-xl p-4 group hover:shadow-md hover:border-border transition-all duration-200 border-l-4 ${getBorderColor()} cursor-pointer hover:bg-muted/50`}
            >
              {/* Número de registro */}
              <div className="absolute -top-2 -right-2 bg-muted text-muted-foreground text-[9px] font-bold px-2 py-0.5 rounded-full border border-border/50 shadow-sm">
                #{listData.length - index}
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {renderListItemInternal(item, type, { diseases: diseaseOptions, fields: fieldOptions, vaccines: vaccineOptions, users: userOptions })}
                </div>
                <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleEdit(item);
                    }}
                    className="p-2 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('[Delete Button] Clicked, item:', item, 'itemId:', resolveRecordId(item));
                      handleDelete(item);
                    }}
                    disabled={deletingItemId !== null && (deletingItemId === resolveRecordId(item))}
                    className={`p-2 rounded-lg transition-all duration-200 ${confirmingDeleteId === resolveRecordId(item)
                      ? 'bg-red-600 text-white shadow-lg shadow-red-500/50 animate-pulse scale-110'
                      : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                      } disabled:opacity-50`}
                    title={confirmingDeleteId === resolveRecordId(item) ? "¡Clic para confirmar eliminación!" : "Eliminar"}
                  >
                    {deletingItemId !== null && (deletingItemId === resolveRecordId(item)) ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : confirmingDeleteId === resolveRecordId(item) ? (
                      <span className="text-xs font-bold">✓</span>
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFormContent = () => {
    const inputClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground/50";
    const labelClass = "block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 ml-1";
    const selectClass = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer";
    const idPrefix = `form-${type}-${modalStateId}`;

    switch (type) {
      case 'genetic_improvement': return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div><label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label><input id={`${idPrefix}-date`} type="date" value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className={inputClass} /></div>
          <div><label htmlFor={`${idPrefix}-tech`} className={labelClass}>Técnica / Tipo *</label><input id={`${idPrefix}-tech`} type="text" placeholder="Ej: Inseminación Artificial" value={formData.genetic_event_technique || ''} onChange={(e) => setFormData({ ...formData, genetic_event_technique: e.target.value })} className={inputClass} /></div>
          <div><label htmlFor={`${idPrefix}-details`} className={labelClass}>Detalles *</label><textarea id={`${idPrefix}-details`} placeholder="..." value={formData.details || ''} onChange={(e) => setFormData({ ...formData, details: e.target.value })} rows={3} className={inputClass} /></div>
          <div><label htmlFor={`${idPrefix}-results`} className={labelClass}>Resultados *</label><textarea id={`${idPrefix}-results`} placeholder="..." value={formData.results || ''} onChange={(e) => setFormData({ ...formData, results: e.target.value })} rows={2} className={inputClass} /></div>
        </div>
      );
      case 'animal_disease': return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div><label htmlFor={`${idPrefix}-disease`} className={labelClass}>Enfermedad *</label><select id={`${idPrefix}-disease`} value={formData.disease_id || ''} onChange={(e) => setFormData({ ...formData, disease_id: parseInt(e.target.value) })} className={selectClass}><option value="">Seleccionar</option>{diseaseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div><label htmlFor={`${idPrefix}-instructor`} className={labelClass}>Instructor *</label><select id={`${idPrefix}-instructor`} value={formData.instructor_id || ''} onChange={(e) => setFormData({ ...formData, instructor_id: parseInt(e.target.value) })} className={selectClass}><option value="">Seleccionar</option>{userOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label><input id={`${idPrefix}-date`} type="date" value={formData.diagnosis_date || ''} onChange={(e) => setFormData({ ...formData, diagnosis_date: e.target.value })} className={inputClass} /></div>
            <div><label htmlFor={`${idPrefix}-status`} className={labelClass}>Estado</label><select id={`${idPrefix}-status`} value={formData.status || 'Activo'} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className={selectClass}><option value="Activo">Activo</option><option value="En tratamiento">En tratamiento</option><option value="Curado">Curado</option></select></div>
          </div>
          <div><label htmlFor={`${idPrefix}-notes`} className={labelClass}>Notas</label><textarea id={`${idPrefix}-notes`} placeholder="..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputClass} /></div>
        </div>
      );
      case 'animal_field': return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div><label htmlFor={`${idPrefix}-field`} className={labelClass}>Campo / Potrero *</label><select id={`${idPrefix}-field`} value={formData.field_id || ''} onChange={(e) => setFormData({ ...formData, field_id: parseInt(e.target.value) })} className={selectClass}><option value="">Seleccionar</option>{fieldOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor={`${idPrefix}-assigndate`} className={labelClass}>Fecha Asignación *</label><input id={`${idPrefix}-assigndate`} type="date" value={formData.assignment_date || ''} onChange={(e) => setFormData({ ...formData, assignment_date: e.target.value })} className={inputClass} /></div>
            <div><label htmlFor={`${idPrefix}-removenate`} className={labelClass}>Fecha Retiro</label><input id={`${idPrefix}-removenate`} type="date" value={formData.removal_date || ''} onChange={(e) => setFormData({ ...formData, removal_date: e.target.value })} className={inputClass} /></div>
          </div>
          <div><label htmlFor={`${idPrefix}-notes`} className={labelClass}>Notas</label><textarea id={`${idPrefix}-notes`} placeholder="..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} className={inputClass} /></div>
        </div>
      );
      case 'vaccination': return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div><label htmlFor={`${idPrefix}-vaccine`} className={labelClass}>Vacuna *</label><select id={`${idPrefix}-vaccine`} value={formData.vaccine_id || ''} onChange={(e) => setFormData({ ...formData, vaccine_id: parseInt(e.target.value) })} className={selectClass}><option value="">Seleccionar</option>{vaccineOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div><label htmlFor={`${idPrefix}-instructor`} className={labelClass}>Instructor *</label><select id={`${idPrefix}-instructor`} value={formData.instructor_id || ''} onChange={(e) => setFormData({ ...formData, instructor_id: parseInt(e.target.value) })} className={selectClass}><option value="">Seleccionar</option>{userOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
          <div><label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label><input id={`${idPrefix}-date`} type="date" value={formData.vaccination_date || ''} onChange={(e) => setFormData({ ...formData, vaccination_date: e.target.value })} className={inputClass} /></div>
        </div>
      );
      case 'treatment': return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div><label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label><input id={`${idPrefix}-date`} type="date" value={formData.treatment_date || ''} onChange={(e) => setFormData({ ...formData, treatment_date: e.target.value })} className={inputClass} /></div>
          <div><label htmlFor={`${idPrefix}-desc`} className={labelClass}>Descripción *</label><textarea id={`${idPrefix}-desc`} placeholder="Descripción del tratamiento" value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className={inputClass} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor={`${idPrefix}-dose`} className={labelClass}>Dosis</label><input id={`${idPrefix}-dose`} type="text" placeholder="Ej: 5ml" value={formData.dosis || ''} onChange={(e) => setFormData({ ...formData, dosis: e.target.value })} className={inputClass} /></div>
            <div><label htmlFor={`${idPrefix}-freq`} className={labelClass}>Frecuencia</label><input id={`${idPrefix}-freq`} type="text" placeholder="Ej: Cada 12 horas" value={formData.frequency || ''} onChange={(e) => setFormData({ ...formData, frequency: e.target.value })} className={inputClass} /></div>
          </div>
          <div><label htmlFor={`${idPrefix}-obs`} className={labelClass}>Observaciones</label><textarea id={`${idPrefix}-obs`} placeholder="Observaciones adicionales" value={formData.observations || ''} onChange={(e) => setFormData({ ...formData, observations: e.target.value })} rows={2} className={inputClass} /></div>
        </div>
      );
      case 'control': return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor={`${idPrefix}-date`} className={labelClass}>Fecha *</label><input id={`${idPrefix}-date`} type="date" value={formData.checkup_date || ''} onChange={(e) => setFormData({ ...formData, checkup_date: e.target.value })} className={inputClass} /></div>
            <div><label htmlFor={`${idPrefix}-status`} className={labelClass}>Estado de Salud *</label><select id={`${idPrefix}-status`} value={formData.health_status || 'Sano'} onChange={(e) => setFormData({ ...formData, health_status: e.target.value })} className={selectClass}><option value="Excelente">Excelente</option><option value="Bueno">Bueno</option><option value="Regular">Regular</option><option value="Malo">Malo</option><option value="Sano">Sano</option></select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label htmlFor={`${idPrefix}-weight`} className={labelClass}>Peso (kg)</label><input id={`${idPrefix}-weight`} type="number" step="0.1" value={formData.weight || ''} onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })} className={inputClass} /></div>
            <div><label htmlFor={`${idPrefix}-height`} className={labelClass}>Altura (m)</label><input id={`${idPrefix}-height`} type="number" step="0.01" value={formData.height || ''} onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) })} className={inputClass} /></div>
          </div>
          <div><label htmlFor={`${idPrefix}-desc`} className={labelClass}>Descripción</label><textarea id={`${idPrefix}-desc`} placeholder="..." value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} className={inputClass} /></div>

          {!editingItem && (
            <div className="space-y-4 pt-4 border-t border-border/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Entradas Pendientes ({pendingBulkItems.length})</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!formData.checkup_date || !formData.health_status) {
                      setError("Complete fecha y estado de salud para añadir a la lista");
                      return;
                    }
                    setPendingBulkItems([...pendingBulkItems, { ...formData }]);
                    const prevDate = formData.checkup_date;
                    setFormData({ animal_id: animal.id, checkup_date: prevDate, health_status: 'Sano', weight: '', height: '', description: '' });
                    setError(null);
                  }}
                  className="h-8 text-xs font-bold border-dashed border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/5"
                >
                  <PlusCircle className="h-3 w-3 mr-1.5" />
                  Añadir otro control a la vez
                </Button>
              </div>

              {pendingBulkItems.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {pendingBulkItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40 text-xs">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <span className="font-semibold">{formatDate(item.checkup_date)}</span>
                        <span className="text-muted-foreground">{item.health_status}</span>
                        <span className="italic">{item.weight ? `${item.weight}kg` : ''} {item.height ? `${item.height}m` : ''}</span>
                      </div>
                      <button
                        onClick={() => setPendingBulkItems(pendingBulkItems.filter((_, i) => i !== idx))}
                        className="p-1 hover:text-destructive transition-colors"
                        title="Quitar de la lista"
                        aria-label="Quitar control de la lista"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      );
      default: return null;
    }
  };

  const handleReplicate = () => {
    if (!editingItem) return;

    // Copiar datos del item actual
    const replicatedData = { ...editingItem };

    // Limpiar campos únicos e identificadores
    delete replicatedData.id;
    delete replicatedData.created_at;
    delete replicatedData.updated_at;
    delete replicatedData.code; // Si existe

    // Establecer fecha a HOY para el nuevo registro (comportamiento usual de replicar)
    const today = getTodayColombia();
    if (replicatedData.checkup_date) replicatedData.checkup_date = today;
    if (replicatedData.date) replicatedData.date = today;
    if (replicatedData.vaccination_date) replicatedData.vaccination_date = today;
    if (replicatedData.treatment_date) replicatedData.treatment_date = today;
    if (replicatedData.diagnosis_date) replicatedData.diagnosis_date = today;
    if (replicatedData.assignment_date) replicatedData.assignment_date = today;

    // Asegurar IDs correctos
    replicatedData.animal_id = animal.id;

    setFormData(replicatedData);
    setEditingItem(null); // NULL para que sea un NUEVO registro
    setModalMode('create');
    showToast('Modo replicación: Datos copiados. Ajuste la fecha si es necesario.', 'info');
  };

  if (modalMode === 'view' && editingItem) {
    return (
      <ItemDetailModal
        type={type as string}
        item={editingItem}
        options={{
          diseases: diseaseOptionsMap,
          fields: fieldOptionsMap,
          vaccines: vaccineOptionsMap,
          users: userOptionsMap
        }}
        onClose={onClose}
        onEdit={() => {
          setFormData(editingItem);
          setModalMode('create');
        }}
        onReplicate={handleReplicate}

        zIndex={zIndex}
      />
    );
  }

  return (
    <>
      <GenericModal
        isOpen={true}
        onOpenChange={(open) => !open && onClose()}
        title={getModalTitle()}
        description={`Gestión de ${type} para el animal ${animal.record || animal.id}`}
        size="2xl"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/10"
        zIndex={zIndex}
      >
        <div className="space-y-4" onKeyDown={(e) => e.stopPropagation()}>
          {modalMode === 'list' ? (
            <>
              {renderListContent()}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/10">
                <Button
                  variant="ghost"
                  onClick={onClose}
                  className="rounded-xl px-6 hover:bg-muted/50 transition-all font-semibold"
                >
                  Cerrar
                </Button>
                <Button
                  onClick={() => { setEditingItem(null); setModalMode('create'); }}
                  className="rounded-xl px-6 bg-primary text-white shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all font-bold"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Entrada
                </Button>
              </div>
            </>
          ) : (
            <>
              {listData.length > 0 && (
                <div className="flex justify-start mb-2">
                  <button
                    onClick={() => { setModalMode('list'); setEditingItem(null); setError(null); }}
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                  >
                    ← Volver a la lista
                  </button>
                </div>
              )}
              <div className="py-2">{renderFormContent()}</div>
              {(error || validationErrors) && (
                <div className="rounded-xl overflow-hidden animate-in fade-in slide-in-from-top-1">
                  <div className={`p-4 border-l-4 ${validationErrors ? 'bg-orange-50 border-orange-500 text-orange-900 dark:bg-orange-950/30 dark:text-orange-200' : 'bg-red-50 border-red-500 text-red-900 dark:bg-red-950/30 dark:text-red-200'} shadow-sm`}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {validationErrors ? (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-sm font-bold">
                          {error || 'Ha ocurrido un error'}
                        </p>

                        {validationErrors && (
                          <ul className="space-y-1.5 mt-2">
                            {Array.isArray(validationErrors) ? (
                              // Si es un array simple de strings
                              validationErrors.map((errStr: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-2 text-xs font-medium opacity-90">
                                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                  <span>{String(errStr)}</span>
                                </li>
                              ))
                            ) : (
                              // Si es un objeto mapa de errores
                              Object.entries(validationErrors).map(([field, fieldErrors], idx) => {
                                const fieldLabel = field === 'description' ? 'Descripción' :
                                  field === 'treatment_date' ? 'Fecha' :
                                    field === 'dosis' ? 'Dosis' : // Es posible que sea "dose" si viene del backend
                                      field === 'dose' ? 'Dosis' :
                                        field === 'frequency' ? 'Frecuencia' :
                                          field === 'checkup_date' ? 'Fecha' :
                                            field === 'health_status' ? 'Estado de salud' :
                                              field === 'vaccine_id' ? 'Vacuna' :
                                                field;

                                const errorText = Array.isArray(fieldErrors) ? fieldErrors.join(', ') : String(fieldErrors);

                                return (
                                  <li key={idx} className="flex items-start gap-2 text-xs font-medium opacity-90">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                                    <span>
                                      <span className="font-bold underline decoration-orange-300/50">{fieldLabel}:</span> {errorText}
                                    </span>
                                  </li>
                                );
                              })
                            )}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-6 mt-2 border-t border-border/10">
                <Button
                  variant="ghost"
                  onClick={() => { if (listData.length > 0) setModalMode('list'); else onClose(); }}
                  disabled={loading}
                  className="w-full sm:w-auto rounded-xl px-6 hover:bg-muted/50 transition-all font-semibold order-3 sm:order-1"
                >
                  {listData.length > 0 ? 'Cancelar' : 'Cerrar'}
                </Button>

                {!editingItem && (
                  <Button
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    variant="outline"
                    className="w-full sm:w-auto rounded-xl px-6 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 transition-all font-semibold order-2"
                  >
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Guardar y añadir otro
                  </Button>
                )}

                <Button
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="w-full sm:w-auto rounded-xl px-8 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all font-bold order-1 sm:order-3"
                >
                  <Save className="h-4 w-4 mr-2 sm:hidden" />
                  {loading ? 'Procesando...' : (editingItem ? 'Actualizar Registro' : 'Guardar y Cerrar')}
                </Button>
              </div>
            </>
          )}
        </div>


        {/* Modal de Insumos del Tratamiento (superpuesto) */}
      </GenericModal >

      {/* Modal de Insumos del Tratamiento (superpuesto fuera del GenericModal para evitar cierre en cascada) */}
      <TreatmentSuppliesModal
        isOpen={suppliesModalOpen}
        onClose={() => {
          setSuppliesModalOpen(false);
          setSelectedTreatmentForSupplies(null);
        }}
        treatment={selectedTreatmentForSupplies}
        className="z-[2000]"
        zIndex={zIndex ? zIndex + 20 : 2000}
      />
    </>
  );
};

function renderListItemInternal(item: any, type: ModalType, options: any) {
  const getLabel = (id: number | string, list: any[]) => {
    if (!list) return `ID: ${id}`;
    return list.find(o => o.value === id)?.label || `ID: ${id}`;
  };

  const getIcon = () => {
    switch (type) {
      case 'genetic_improvement': return <Dna className="w-4 h-4 text-emerald-500" />;
      case 'animal_disease': return <Activity className="w-4 h-4 text-rose-500" />;
      case 'animal_field': return <MapPin className="w-4 h-4 text-amber-500" />;
      case 'vaccination': return <Syringe className="w-4 h-4 text-blue-500" />;
      case 'treatment': return <Pill className="w-4 h-4 text-purple-500" />;
      case 'control': return <ClipboardList className="w-4 h-4 text-orange-500" />;
      default: return null;
    }
  };

  const content = (() => {
    switch (type) {
      case 'genetic_improvement':
        return (
          <div className="space-y-1">
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-bold text-foreground leading-tight">
                {item.improvement_type || item.genetic_event_technique || 'Mejora Genética'}
              </span>
              <Badge variant="outline" className="text-[10px] h-5 bg-emerald-500/5 text-emerald-600 border-emerald-200 shrink-0">
                {formatDate(item.date)}
              </Badge>
            </div>
            {item.details && (
              <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/30 p-1.5 rounded-md mt-1 italic">
                "{item.details}"
              </p>
            )}
            {item.results && (
              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-medium text-foreground/70">
                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                Resultado: {item.results}
              </div>
            )}
          </div>
        );
      case 'animal_disease':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm font-bold text-foreground truncate">
                {getLabel(item.disease_id, options.diseases)}
              </span>
              <Badge
                variant={item.status === 'Activo' ? 'destructive' : 'default'}
                className={`text-[10px] h-5 ${item.status === 'Curado' ? 'bg-green-600 text-white' : ''}`}
              >
                {item.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground/60">Diagnóstico:</span>
                <span>{formatDate(item.diagnosis_date)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-foreground/60">Por:</span>
                <span className="truncate max-w-[100px]">{getLabel(item.instructor_id, options.users)}</span>
              </div>
            </div>
            {item.notes && (
              <p className="text-[10px] text-muted-foreground/80 border-l-2 border-rose-200 pl-2 mt-1">
                {item.notes}
              </p>
            )}
          </div>
        );
      case 'animal_field':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-start gap-2">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground">
                  {getLabel(item.field_id, options.fields)}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px] h-4 bg-amber-500/5 text-amber-600 border-amber-200">
                    Desde: {formatDate(item.assignment_date)}
                  </Badge>
                  {item.removal_date && (
                    <Badge variant="outline" className="text-[9px] h-4 bg-gray-500/5 text-gray-500 border-gray-200">
                      Hasta: {formatDate(item.removal_date)}
                    </Badge>
                  )}
                </div>
              </div>
              <Badge variant={item.removal_date ? 'secondary' : 'default'} className={`text-[10px] h-5 ${!item.removal_date ? 'bg-green-600 text-white animate-pulse' : ''}`}>
                {item.removal_date ? 'Retirado' : 'Activo'}
              </Badge>
            </div>
            {item.notes && (
              <p className="text-[10px] text-muted-foreground/80 italic line-clamp-1 border-l-2 border-amber-200 pl-2">
                {item.notes}
              </p>
            )}
          </div>
        );
      case 'vaccination':
        return (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="text-sm font-bold text-foreground">
                {getLabel(item.vaccine_id, options.vaccines)}
              </span>
              <Badge variant="outline" className="text-[10px] h-5 bg-blue-500/5 text-blue-600 border-blue-200">
                {formatDate(item.vaccination_date)}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="font-semibold">Instructor:</span>
              <span className="truncate">{getLabel(item.instructor_id, options.users)}</span>
              {item.batch_number && (
                <>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="font-semibold">Lote:</span>
                  <span>{item.batch_number}</span>
                </>
              )}
            </div>
          </div>
        );
      case 'treatment':
        return (
          <div className="space-y-2">
            <div className="flex justify-between items-start gap-2">
              <span className="text-sm font-bold text-foreground leading-tight">
                {item.diagnosis || item.description || 'Tratamiento'}
              </span>
              <Badge variant="outline" className="text-[10px] h-5 bg-purple-500/5 text-purple-600 border-purple-200 shrink-0">
                {formatDate(item.treatment_date)}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2 bg-purple-500/5 rounded-lg">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-purple-700 uppercase">Dosis</span>
                <span className="text-[10px] text-foreground font-medium truncate">{item.dosis || '-'}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-purple-700 uppercase">Frecuencia</span>
                <span className="text-[10px] text-foreground font-medium truncate">{item.frequency || '-'}</span>
              </div>
            </div>
            {item.veterinarian && (
              <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-medium">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>Veterinario: <span className="text-foreground">{item.veterinarian}</span></span>
              </div>
            )}
          </div>
        );
      case 'control': {
        const healthStatus = item.health_status || 'Desconocido';
        const healthConfig = ({
          'Excelente': { color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-200', icon: '✓' },
          'Bueno': { color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-200', icon: '✓' },
          'Sano': { color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-200', icon: '✓' },
          'Regular': { color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-200', icon: '⚠' },
          'Malo': { color: 'text-rose-600', bg: 'bg-rose-500/10', border: 'border-rose-200', icon: '✗' },
        } as Record<string, { color: string; bg: string; border: string; icon: string; }>)[healthStatus] || { color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-border', icon: '?' };

        return (
          <div className="space-y-3">
            {/* Header con estado y fecha */}
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${healthConfig.bg} ${healthConfig.color} border ${healthConfig.border}`}>
                  <span>{healthConfig.icon}</span>
                  {healthStatus}
                </span>
              </div>
              <Badge variant="outline" className="text-[10px] h-6 px-2 bg-orange-500/5 text-orange-600 border-orange-200 font-semibold">
                📅 {formatDate(item.checkup_date)}
              </Badge>
            </div>

            {/* Métricas en grid */}
            <div className="grid grid-cols-2 gap-3">
              {item.weight && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-blue-600 text-sm">⚖️</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground font-medium uppercase">Peso</span>
                    <span className="text-sm font-black text-foreground">{item.weight} <span className="text-[10px] font-normal">kg</span></span>
                  </div>
                </div>
              )}
              {item.height && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                  <div className="w-8 h-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                    <span className="text-teal-600 text-sm">📏</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground font-medium uppercase">Altura</span>
                    <span className="text-sm font-black text-foreground">{item.height} <span className="text-[10px] font-normal">m</span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Descripción */}
            {item.description && (
              <div className="p-2 rounded-lg bg-muted/20 border-l-2 border-orange-300">
                <p className="text-xs text-muted-foreground italic line-clamp-2">
                  "{item.description}"
                </p>
              </div>
            )}
          </div>
        );
      }
      default: return null;
    }
  })();

  return (
    <div className="flex gap-3">
      <div className="mt-0.5 shrink-0 bg-background shadow-sm border border-border/40 p-1.5 rounded-lg h-fit">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        {content}
      </div>
    </div>
  );
}
