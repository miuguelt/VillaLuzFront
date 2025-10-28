import React, { useState, useEffect } from 'react';
import { MoreVertical, Dna, Activity, Syringe, Pill, MapPin, ClipboardList, Eye, Plus, History, GitBranch, Baby, Edit2, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { GenericModal } from '@/components/common/GenericModal';
import { AnimalResponse } from '@/types/swaggerTypes';
import { getTodayColombia } from '@/utils/dateUtils';
import { SectionCard, InfoField } from '@/components/common/ModalStyles';
import { Badge } from '@/components/ui/badge';

// Importar servicios
import { geneticImprovementsService } from '@/services/geneticImprovementsService';
import { animalDiseasesService } from '@/services/animalDiseasesService';
import { animalFieldsService } from '@/services/animalFieldsService';
import { vaccinationsService } from '@/services/vaccinationsService';
import { treatmentsService } from '@/services/treatmentsService';
import { controlService } from '@/services/controlService';
import { diseaseService } from '@/services/diseaseService';
import { fieldService } from '@/services/fieldService';
import { vaccinesService } from '@/services/vaccinesService';
import { usersService } from '@/services/userService';

interface AnimalActionsMenuProps {
  animal: AnimalResponse;
  currentUserId?: number;
  onOpenHistory?: () => void;
  onOpenAncestorsTree?: () => void;
  onOpenDescendantsTree?: () => void;
  onRefresh?: () => void;
}

type ModalType =
  | 'genetic_improvement'
  | 'animal_disease'
  | 'animal_field'
  | 'vaccination'
  | 'treatment'
  | 'control'
  | null;

type ModalMode = 'create' | 'list';

export const AnimalActionsMenu: React.FC<AnimalActionsMenuProps> = ({ animal, currentUserId, onOpenHistory, onOpenAncestorsTree, onOpenDescendantsTree, onRefresh }) => {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<number | null>(null);

  // Opciones para los selects
  const [diseaseOptions, setDiseaseOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [fieldOptions, setFieldOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [vaccineOptions, setVaccineOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [userOptions, setUserOptions] = useState<Array<{ value: number; label: string }>>([]);

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
  }, [openModal, modalMode, animal.id]);

  const loadOptions = async () => {
    try {
      const [diseases, fields, vaccines, users] = await Promise.all([
        diseaseService.getDiseases({ page: 1, limit: 1000 }).catch(() => []),
        fieldService.getFields({ page: 1, limit: 1000 }).catch(() => []),
        vaccinesService.getVaccines?.({ page: 1, limit: 1000 }).catch(() => []),
        usersService.getUsers({ page: 1, limit: 1000 }).catch(() => []),
      ]);

      const diseasesData = (diseases as any)?.data || diseases || [];
      setDiseaseOptions(diseasesData.map((d: any) => ({
        value: d.id,
        label: d.disease || d.name || `Enfermedad ${d.id}`
      })));

      const fieldsData = (fields as any)?.data || fields || [];
      setFieldOptions(fieldsData.map((f: any) => ({
        value: f.id,
        label: f.name || `Campo ${f.id}`
      })));

      const vaccinesData = (vaccines as any)?.data || vaccines || [];
      setVaccineOptions(vaccinesData.map((v: any) => ({
        value: v.id,
        label: v.name || `Vacuna ${v.id}`
      })));

      const usersData = (users as any)?.data || users || [];
      setUserOptions(usersData.map((u: any) => ({
        value: u.id,
        label: u.fullname || u.name || `Usuario ${u.id}`
      })));
    } catch (err) {
      console.error('Error loading options:', err);
    }
  };

  const loadListData = async () => {
    setLoadingList(true);
    try {
      let data: any[] = [];

      // Limpiar caché antes de cargar para asegurar datos frescos
      switch (openModal) {
        case 'genetic_improvement':
          (geneticImprovementsService as any).clearCache?.();
          {
            const giResult = await (geneticImprovementsService as any).getAll?.({
              animal_id: animal.id,
              limit: 100,
              cache_bust: Date.now() // Forzar bypass de caché
            });
            data = Array.isArray(giResult) ? giResult : (giResult?.data || giResult?.items || []);
            data = data.filter((item: any) => item.animal_id === animal.id);
            break;
          }

        case 'animal_disease':
          (animalDiseasesService as any).clearCache?.();
          {
            const adResult = await (animalDiseasesService as any).getAll?.({
              animal_id: animal.id,
              limit: 100,
              cache_bust: Date.now()
            });
            data = Array.isArray(adResult) ? adResult : (adResult?.data || adResult?.items || []);
            data = data.filter((item: any) => item.animal_id === animal.id);
            break;
          }

        case 'animal_field':
          (animalFieldsService as any).clearCache?.();
          {
            const afResult = await (animalFieldsService as any).getAll?.({
              animal_id: animal.id,
              limit: 100,
              cache_bust: Date.now()
            });
            data = Array.isArray(afResult) ? afResult : (afResult?.data || afResult?.items || []);
            data = data.filter((item: any) => item.animal_id === animal.id);
            break;
          }

        case 'vaccination':
          (vaccinationsService as any).clearCache?.();
          {
            const vResult = await (vaccinationsService as any).getAll?.({
              animal_id: animal.id,
              limit: 100,
              cache_bust: Date.now()
            });
            data = Array.isArray(vResult) ? vResult : (vResult?.data || vResult?.items || []);
            data = data.filter((item: any) => item.animal_id === animal.id);
            break;
          }

        case 'treatment':
          (treatmentsService as any).clearCache?.();
          {
            const tResult = await (treatmentsService as any).getAll?.({
              animal_id: animal.id,
              limit: 100,
              cache_bust: Date.now()
            });
            data = Array.isArray(tResult) ? tResult : (tResult?.data || tResult?.items || []);
            data = data.filter((item: any) => item.animal_id === animal.id);
            break;
          }

        case 'control':
          (controlService as any).clearCache?.();
          {
            const cResult = await (controlService as any).getAll?.({
              animal_id: animal.id,
              limit: 100,
              cache_bust: Date.now()
            });
            data = Array.isArray(cResult) ? cResult : (cResult?.data || cResult?.items || []);
            console.log('[AnimalActionsMenu] Controles recibidos del backend:', data.length);
            console.log('[AnimalActionsMenu] Datos:', data);
            data = data.filter((item: any) => item.animal_id === animal.id);
            console.log('[AnimalActionsMenu] Controles después de filtrar por animal_id', animal.id, ':', data.length);
            break;
          }
      }

      console.log('[AnimalActionsMenu] Total registros a mostrar:', data.length);
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
      // Inicializar formulario según el tipo
      switch (type) {
        case 'genetic_improvement':
          setFormData({
            animal_id: animal.id,
            date: getTodayColombia(),
            improvement_type: '',
            description: '',
            expected_result: '',
          });
          break;
        case 'animal_disease':
          setFormData({
            animal_id: animal.id,
            disease_id: undefined,
            instructor_id: currentUserId,
            diagnosis_date: getTodayColombia(),
            status: 'Activo',
            notes: '',
          });
          break;
        case 'animal_field':
          setFormData({
            animal_id: animal.id,
            field_id: undefined,
            assignment_date: getTodayColombia(),
            removal_date: undefined,
            notes: '',
          });
          break;
        case 'vaccination':
          setFormData({
            animal_id: animal.id,
            vaccine_id: undefined,
            vaccination_date: getTodayColombia(),
            apprentice_id: currentUserId,
            instructor_id: currentUserId,
          });
          break;
        case 'treatment':
          setFormData({
            animal_id: animal.id,
            treatment_date: getTodayColombia(),
            diagnosis: '',
            description: '',
            frequency: '',
            observations: '',
          });
          break;
        case 'control':
          setFormData({
            animal_id: animal.id,
            checkup_date: getTodayColombia(),
            weight: undefined,
            height: undefined,
            health_status: 'Sano',
            description: '',
          });
          break;
      }
    }
  };

  const handleCloseModal = () => {
    setOpenModal(null);
    setFormData({});
    setError(null);
    setListData([]);
    setEditingItem(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const isEditing = !!editingItem;

      switch (openModal) {
        case 'genetic_improvement':
          if (!formData.animal_id) {
            throw new Error('El ID del animal es requerido');
          }
          if (!formData.improvement_type?.trim()) {
            throw new Error('El tipo de mejora genética es obligatorio');
          }
          if (!formData.date) {
            throw new Error('La fecha es obligatoria');
          }
          if (isEditing) {
            await geneticImprovementsService.updateGeneticImprovement(editingItem.id, formData);
          } else {
            await geneticImprovementsService.createGeneticImprovement(formData);
          }
          break;
        case 'animal_disease':
          if (!formData.animal_id) {
            throw new Error('El ID del animal es requerido');
          }
          if (!formData.disease_id || !formData.instructor_id) {
            throw new Error('Enfermedad e instructor son obligatorios');
          }
          if (isEditing) {
            await animalDiseasesService.updateAnimalDisease(editingItem.id, formData);
          } else {
            await animalDiseasesService.createAnimalDisease(formData);
          }
          break;
        case 'animal_field':
          if (!formData.animal_id) {
            throw new Error('El ID del animal es requerido');
          }
          if (!formData.field_id) {
            throw new Error('El campo es obligatorio');
          }
          if (!formData.assignment_date) {
            throw new Error('La fecha de asignación es obligatoria');
          }
          if (isEditing) {
            await animalFieldsService.updateAnimalField(editingItem.id, formData);
          } else {
            await animalFieldsService.createAnimalField(formData);
          }
          break;
        case 'vaccination':
          if (!formData.animal_id) {
            throw new Error('El ID del animal es requerido');
          }
          if (!formData.vaccine_id) {
            throw new Error('La vacuna es obligatoria');
          }
          if (!formData.vaccination_date) {
            throw new Error('La fecha de vacunación es obligatoria');
          }
          if (isEditing) {
            await vaccinationsService.updateVaccination(editingItem.id, formData);
          } else {
            await vaccinationsService.createVaccination(formData);
          }
          break;
        case 'treatment':
          if (!formData.animal_id) {
            throw new Error('El ID del animal es requerido');
          }
          if (!formData.diagnosis?.trim()) {
            throw new Error('El diagnóstico es obligatorio');
          }
          if (!formData.treatment_date) {
            throw new Error('La fecha del tratamiento es obligatoria');
          }
          if (isEditing) {
            await treatmentsService.updateTreatment(editingItem.id, formData);
          } else {
            await treatmentsService.createTreatment(formData);
          }
          break;
        case 'control':
          if (!formData.animal_id) {
            throw new Error('El ID del animal es requerido');
          }
          if (!formData.checkup_date && !formData.control_date) {
            throw new Error('La fecha del control es obligatoria');
          }
          if (isEditing) {
            await controlService.updateControl(editingItem.id, formData);
          } else {
            await controlService.createControl(formData);
          }
          break;
      }

      // Mostrar modo lista después de crear/editar exitosamente
      setModalMode('list');
      setError(null);
      setEditingItem(null);
      // Recargar datos de la lista
      await loadListData();

      // Refrescar datos de la tabla principal si se proporcionó callback
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData(item);
    setModalMode('create');
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm('¿Está seguro de eliminar este registro?')) return;

    setDeletingItemId(itemId);
    try {
      switch (openModal) {
        case 'genetic_improvement':
          await geneticImprovementsService.deleteGeneticImprovement(itemId);
          break;
        case 'animal_disease':
          await animalDiseasesService.deleteAnimalDisease(itemId);
          break;
        case 'animal_field':
          await animalFieldsService.deleteAnimalField(itemId);
          break;
        case 'vaccination':
          await vaccinationsService.deleteVaccination(itemId);
          break;
        case 'treatment':
          await treatmentsService.deleteTreatment(itemId);
          break;
        case 'control':
          await controlService.deleteControl(itemId);
          break;
      }

      // Recargar lista después de eliminar
      await loadListData();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Error al eliminar');
    } finally {
      setDeletingItemId(null);
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
        <div className="py-6 text-center bg-gradient-to-br from-muted/20 to-muted/5 rounded-xl border-2 border-dashed border-border/50">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">No hay registros</p>
          <p className="text-xs text-muted-foreground/70 mt-0.5 mb-3">Este animal aún no tiene registros de este tipo</p>
          <button
            onClick={() => setModalMode('create')}
            className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear primer registro
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {listData.map((item, index) => (
          <div
            key={item.id || index}
            className="bg-gradient-to-br from-accent/30 to-accent/10 border border-border/60 rounded-xl p-3 hover:shadow-lg hover:border-primary/30 transition-all duration-300 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {renderListItem(item)}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingItemId === item.id}
                  className="p-2 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors disabled:opacity-50"
                  title="Eliminar"
                >
                  {deletingItemId === item.id ? (
                    <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderListItem = (item: any) => {
    switch (openModal) {
      case 'genetic_improvement':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoField
                label="Tipo de Mejora"
                value={item.improvement_type || item.genetic_event_technique || '-'}
              />
              <InfoField
                label="Fecha"
                value={item.date ? new Date(item.date).toLocaleDateString('es-ES') : '-'}
              />
            </div>
            {(item.description || item.details) && (
              <div>
                <div className="text-xs text-foreground/70 mb-1.5 font-medium">Descripción</div>
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-2.5">{item.description || item.details}</p>
              </div>
            )}
            {(item.expected_result || item.results) && (
              <div>
                <div className="text-xs text-foreground/70 mb-1.5 font-medium">Resultado Esperado</div>
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-2.5">{item.expected_result || item.results}</p>
              </div>
            )}
          </div>
        );

      case 'animal_disease':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoField
                label="Enfermedad ID"
                value={item.disease_id || '-'}
              />
              <div>
                <div className="text-xs text-foreground/70 mb-1.5 font-medium">Estado</div>
                <Badge
                  variant={item.status === 'Activo' ? 'destructive' : 'default'}
                  className={item.status === 'Curado' ? 'bg-green-600 text-white' : ''}
                >
                  {item.status || '-'}
                </Badge>
              </div>
            </div>
            <InfoField
              label="Fecha de Diagnóstico"
              value={item.diagnosis_date ? new Date(item.diagnosis_date).toLocaleDateString('es-ES') : '-'}
            />
            {item.notes && (
              <div>
                <div className="text-xs text-foreground/70 mb-1.5 font-medium">Notas</div>
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-2.5">{item.notes}</p>
              </div>
            )}
          </div>
        );

      case 'animal_field':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoField
                label="Campo ID"
                value={item.field_id || '-'}
              />
              <InfoField
                label="Asignación"
                value={item.assignment_date ? new Date(item.assignment_date).toLocaleDateString('es-ES') : '-'}
              />
            </div>
            <div>
              <div className="text-xs text-foreground/70 mb-1.5 font-medium">Estado</div>
              {item.removal_date ? (
                <Badge variant="secondary">
                  Retirado: {new Date(item.removal_date).toLocaleDateString('es-ES')}
                </Badge>
              ) : (
                <Badge className="bg-green-600 text-white">Actualmente asignado</Badge>
              )}
            </div>
            {item.notes && (
              <div>
                <div className="text-xs text-foreground/70 mb-1.5 font-medium">Notas</div>
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-2.5">{item.notes}</p>
              </div>
            )}
          </div>
        );

      case 'vaccination':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoField
                label="Vacuna ID"
                value={item.vaccine_id || '-'}
              />
              <InfoField
                label="Fecha"
                value={item.vaccination_date ? new Date(item.vaccination_date).toLocaleDateString('es-ES') : '-'}
              />
            </div>
          </div>
        );

      case 'treatment':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoField
                label="Diagnóstico"
                value={item.diagnosis || '-'}
              />
              <InfoField
                label="Fecha"
                value={item.treatment_date ? new Date(item.treatment_date).toLocaleDateString('es-ES') : '-'}
              />
            </div>
            {item.description && (
              <div>
                <div className="text-xs text-foreground/70 mb-1.5 font-medium">Descripción</div>
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-2.5">{item.description}</p>
              </div>
            )}
            {item.frequency && (
              <InfoField
                label="Frecuencia"
                value={item.frequency}
              />
            )}
          </div>
        );

      case 'control':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <InfoField
                label="Fecha"
                value={item.checkup_date ? new Date(item.checkup_date).toLocaleDateString('es-ES') : '-'}
              />
              <InfoField
                label="Peso"
                value={item.weight ? `${item.weight} kg` : '-'}
              />
              <InfoField
                label="Altura"
                value={item.height ? `${item.height} m` : '-'}
              />
            </div>
            <div>
              <div className="text-xs text-foreground/70 mb-1.5 font-medium">Estado de Salud</div>
              <Badge
                className={
                  item.health_status === 'Excelente' ? 'bg-green-600 text-white' :
                  item.health_status === 'Bueno' || item.health_status === 'Sano' ? 'bg-blue-600 text-white' :
                  item.health_status === 'Regular' ? 'bg-yellow-600 text-white' :
                  item.health_status === 'Malo' ? 'bg-red-600 text-white' :
                  ''
                }
              >
                {item.health_status || item.healt_status || 'Sano'}
              </Badge>
            </div>
            {item.description && (
              <div>
                <div className="text-xs text-foreground/70 mb-1.5 font-medium">Descripción</div>
                <p className="text-sm text-foreground/80 bg-muted/30 rounded-lg p-2.5">{item.description}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const renderFormContent = () => {
    const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
    const labelClass = "block text-sm font-medium mb-1.5 text-foreground";
    const selectClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

    switch (openModal) {
      case 'genetic_improvement':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha *</label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Tipo de Mejora Genética *</label>
              <input
                type="text"
                value={formData.improvement_type || ''}
                onChange={(e) => setFormData({ ...formData, improvement_type: e.target.value })}
                placeholder="Tipo de mejora (ej: Inseminación, Cruzamiento, etc.)"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la mejora genética"
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Resultado Esperado</label>
              <textarea
                value={formData.expected_result || ''}
                onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
                placeholder="Resultado esperado de la mejora"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'animal_disease':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Enfermedad *</label>
              <select
                value={formData.disease_id || ''}
                onChange={(e) => setFormData({ ...formData, disease_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar enfermedad</option>
                {diseaseOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Instructor *</label>
              <select
                value={formData.instructor_id || ''}
                onChange={(e) => setFormData({ ...formData, instructor_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar instructor</option>
                {userOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha de Diagnóstico *</label>
              <input
                type="date"
                value={formData.diagnosis_date || ''}
                onChange={(e) => setFormData({ ...formData, diagnosis_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Estado</label>
              <select
                value={formData.status || 'Activo'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className={selectClass}
              >
                <option value="Activo">Activo</option>
                <option value="En tratamiento">En tratamiento</option>
                <option value="Curado">Curado</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Notas</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observaciones"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'animal_field':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Campo *</label>
              <select
                value={formData.field_id || ''}
                onChange={(e) => setFormData({ ...formData, field_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar campo</option>
                {fieldOptions.map((opt) => (
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

      case 'vaccination':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Vacuna *</label>
              <select
                value={formData.vaccine_id || ''}
                onChange={(e) => setFormData({ ...formData, vaccine_id: parseInt(e.target.value) })}
                className={selectClass}
              >
                <option value="">Seleccionar vacuna</option>
                {vaccineOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Fecha de Vacunación *</label>
              <input
                type="date"
                value={formData.vaccination_date || ''}
                onChange={(e) => setFormData({ ...formData, vaccination_date: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'treatment':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de Tratamiento *</label>
              <input
                type="date"
                value={formData.treatment_date || ''}
                onChange={(e) => setFormData({ ...formData, treatment_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Diagnóstico *</label>
              <input
                type="text"
                value={formData.diagnosis || ''}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="Ej: Fiebre, infección..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del tratamiento"
                rows={3}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Frecuencia</label>
              <input
                type="text"
                value={formData.frequency || ''}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="Ej: Una vez al día"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Observaciones</label>
              <textarea
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                placeholder="Observaciones"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      case 'control':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Animal</label>
              <input
                type="text"
                value={animal.record || `ID ${animal.id}`}
                disabled
                className={`${inputClass} bg-muted/50`}
              />
            </div>
            <div>
              <label className={labelClass}>Fecha de Chequeo *</label>
              <input
                type="date"
                value={formData.checkup_date || ''}
                onChange={(e) => setFormData({ ...formData, checkup_date: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Peso (kg)</label>
                <input
                  type="number"
                  value={formData.weight || ''}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  placeholder="Peso en kg"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Altura (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.height || ''}
                  onChange={(e) => setFormData({ ...formData, height: parseFloat(e.target.value) })}
                  placeholder="Altura en metros"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Estado de Salud *</label>
              <select
                value={formData.health_status || 'Sano'}
                onChange={(e) => setFormData({ ...formData, health_status: e.target.value })}
                className={selectClass}
              >
                <option value="Excelente">Excelente</option>
                <option value="Bueno">Bueno</option>
                <option value="Regular">Regular</option>
                <option value="Malo">Malo</option>
                <option value="Sano">Sano</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Descripción</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción del control"
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    const isEditing = !!editingItem;
    const animalName = animal.record || `#${animal.id}`;

    switch (openModal) {
      case 'genetic_improvement':
        if (modalMode === 'list') return `Mejoras Genéticas - ${animalName}`;
        return isEditing ? `Editar Mejora Genética - ${animalName}` : `Nueva Mejora Genética - ${animalName}`;
      case 'animal_disease':
        if (modalMode === 'list') return `Enfermedades - ${animalName}`;
        return isEditing ? `Editar Enfermedad - ${animalName}` : `Registrar Enfermedad - ${animalName}`;
      case 'animal_field':
        if (modalMode === 'list') return `Asignaciones de Campo - ${animalName}`;
        return isEditing ? `Editar Asignación - ${animalName}` : `Asignar a Campo - ${animalName}`;
      case 'vaccination':
        if (modalMode === 'list') return `Vacunaciones - ${animalName}`;
        return isEditing ? `Editar Vacunación - ${animalName}` : `Registrar Vacunación - ${animalName}`;
      case 'treatment':
        if (modalMode === 'list') return `Tratamientos - ${animalName}`;
        return isEditing ? `Editar Tratamiento - ${animalName}` : `Registrar Tratamiento - ${animalName}`;
      case 'control':
        if (modalMode === 'list') return `Controles - ${animalName}`;
        return isEditing ? `Editar Control - ${animalName}` : `Nuevo Control - ${animalName}`;
      default:
        return `Detalles - ${animalName}`;
    }
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

      <GenericModal
        isOpen={openModal !== null}
        onOpenChange={(open) => !open && handleCloseModal()}
        title={getModalTitle()}
        size="2xl"
        enableBackdropBlur
        className="bg-card/95 backdrop-blur-md text-card-foreground border-border/50"
      >
        <div className="space-y-3">
          {modalMode === 'list' ? (
            <>
              {renderListContent()}

              {/* Botón para crear nuevo - siempre visible en modo lista */}
              <div className="flex justify-between items-center pt-3 border-t border-border/50">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    handleOpenModal(openModal, 'create');
                  }}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Crear Nuevo
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Botón para volver a la lista si hay registros */}
              {listData.length > 0 && (
                <div className="flex justify-start mb-2">
                  <button
                    onClick={() => {
                      setModalMode('list');
                      setEditingItem(null);
                      setError(null);
                    }}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    ← Volver a la lista
                  </button>
                </div>
              )}

              {renderFormContent()}

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <button
                  onClick={() => {
                    if (listData.length > 0) {
                      setModalMode('list');
                      setEditingItem(null);
                      setError(null);
                    } else {
                      handleCloseModal();
                    }
                  }}
                  className="px-4 py-2 text-sm rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                  disabled={loading}
                >
                  {listData.length > 0 ? 'Cancelar' : 'Cerrar'}
                </button>
                <button
                  onClick={handleSubmit}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </>
          )}
        </div>
      </GenericModal>
    </>
  );
};
