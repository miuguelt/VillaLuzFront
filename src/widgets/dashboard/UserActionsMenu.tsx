import React, { useState, useEffect, useCallback } from 'react';
import { MoreVertical, Activity, Syringe, Eye, Plus, Trash2 } from 'lucide-react';
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
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { UserResponse } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';

// Importar servicios
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { getAnimalLabel } from '@/entities/animal/lib/animalHelpers';

interface UserActionsMenuProps {
  user: UserResponse;
}

type ModalType = 'animal_disease' | 'vaccination' | null;
type ModalMode = 'create' | 'list';

export const UserActionsMenu: React.FC<UserActionsMenuProps> = ({ user }) => {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [modalMode, setModalMode] = useState<ModalMode>('create');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listData, setListData] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [animalLabelById, setAnimalLabelById] = useState<Map<number, string>>(new Map());

  // Opciones para los selects
  const [animalOptions, setAnimalOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [diseaseOptions, setDiseaseOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [vaccineOptions, setVaccineOptions] = useState<Array<{ value: number; label: string }>>([]);

  // Cargar opciones
  const loadOptions = useCallback(async () => {
    try {
      const [animals, diseases, vaccines] = await Promise.all([
        animalsService.getAnimals({ page: 1, limit: 1000 }).catch(() => []),
        diseaseService.getDiseases({ page: 1, limit: 1000 }).catch(() => []),
        vaccinesService.getVaccines?.({ page: 1, limit: 1000 }).catch(() => []),
      ]);

      const animalsData = animals || [];
      setAnimalOptions(animalsData.map((a: any) => ({
        value: a.id,
        label: a.record || `ID ${a.id}`
      })));

      const diseasesData = (diseases as any)?.data || diseases || [];
      setDiseaseOptions(diseasesData.map((d: any) => ({
        value: d.id,
        label: d.disease || d.name || `Enfermedad ${d.id}`
      })));

      const vaccinesData = (vaccines as any)?.data || vaccines || [];
      setVaccineOptions(vaccinesData.map((v: any) => ({
        value: v.id,
        label: v.name || `Vacuna ${v.id}`
      })));
    } catch (err) {
      console.error('Error loading options:', err);
    }
  }, []);

  // Cargar lista de datos
  const loadListData = useCallback(async () => {
    setLoadingList(true);
    try {
      let data: any[] = [];
      const userIdentity = String(user?.identification ?? user?.id ?? '');
      const userId = Number(user?.id ?? 0);

      const animalsList = await animalsService.getAnimals({ page: 1, limit: 1000 }).catch(() => []);
      const safeAnimals = Array.isArray(animalsList) ? animalsList : [];

      const userAnimalRecords = safeAnimals.filter((animal: any) => {
        const nestedId = animal?.user?.id;
        const nestedIdentification = animal?.user?.identification;
        const directId = animal?.user_id ?? animal?.userId;
        if (nestedId != null && Number(nestedId) === userId) return true;
        if (directId != null && Number(directId) === userId) return true;
        return String(nestedIdentification ?? '') === userIdentity;
      });

      const userAnimalIds = new Set(
        userAnimalRecords
          .map((animal: any) => Number(animal?.id))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      );

      const labelMap = new Map(
        userAnimalRecords.map((animal: any) => [
          Number(animal?.id),
          getAnimalLabel(animal) || animal.code || animal.record || `Animal ${animal?.id}`,
        ])
      );
      setAnimalLabelById(labelMap);

      const getAnimalIdFromRecord = (record: any): number | null => {
        const candidates = [
          record?.animal_id,
          record?.animalId,
          record?.animals?.id,
          record?.animal?.id,
          record?.animals_id,
        ];
        const candidate = candidates.find((value) => value != null && value !== '');
        const num = Number(candidate);
        return Number.isFinite(num) ? num : null;
      };

      const isUserFkRecord = (record: any): boolean => {
        if (!record) return false;

        const animalId = getAnimalIdFromRecord(record);
        if (animalId != null && userAnimalIds.has(animalId)) {
          return true;
        }

        const directIdCandidates = [
          record?.user_id,
          record?.userId,
          record?.apprentice_id,
          record?.apprenticeId,
          record?.instructor_id,
          record?.instructorId,
          record?.owner_id,
          record?.ownerId,
        ];

        if (userId && directIdCandidates.some((value) => Number(value) === userId)) {
          return true;
        }

        const nestedUsers = [
          record?.user,
          record?.apprentice,
          record?.instructor,
          record?.owner,
        ].filter(Boolean);

        for (const nested of nestedUsers) {
          if (nested?.id != null && Number(nested.id) === userId) return true;
          if (nested?.identification != null && String(nested.identification) === userIdentity) return true;
        }

        return false;
      };

      switch (openModal) {
        case 'animal_disease':
          {
            const adResult = await animalDiseasesService.getAll({ page: 1, limit: 1000 }).catch(() => []);
            const allDiseases = Array.isArray(adResult) ? adResult : (adResult as any)?.data || (adResult as any)?.items || [];
            data = allDiseases.filter((item: any) => isUserFkRecord(item));
            break;
          }

        case 'vaccination':
          {
            const vResult = await vaccinationsService.getAll({ page: 1, limit: 1000 }).catch(() => []);
            const allVaccinations = Array.isArray(vResult) ? vResult : (vResult as any)?.data || (vResult as any)?.items || [];
            data = allVaccinations.filter((item: any) => isUserFkRecord(item));
            break;
          }
      }

      setListData(data);
    } catch (err: any) {
      console.error('Error loading list data:', err);
      setError('Error al cargar los registros');
    } finally {
      setLoadingList(false);
    }
  }, [openModal, user?.id, user?.identification]);

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
  }, [openModal, modalMode, user?.id, user?.identification, loadListData]);

  const handleOpenModal = (type: ModalType, mode: ModalMode) => {
    setOpenModal(type);
    setModalMode(mode);
    setError(null);
    setListData([]);

    if (mode === 'create') {
      // Inicializar formulario según el tipo
      switch (type) {
        case 'animal_disease':
          setFormData({
            animal_id: undefined,
            disease_id: undefined,
            instructor_id: user.id,
            diagnosis_date: getTodayColombia(),
            status: 'Activo',
            notes: '',
          });
          break;
        case 'vaccination':
          setFormData({
            animal_id: undefined,
            vaccine_id: undefined,
            vaccination_date: getTodayColombia(),
            apprentice_id: user.role === 'Aprendiz' ? user.id : undefined,
            instructor_id: user.role === 'Instructor' ? user.id : undefined,
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
  };

  const getAnimalLabelForId = (animalId: number | null | undefined): string => {
    if (!animalId) return '-';
    return animalLabelById.get(Number(animalId)) || `Animal ${animalId}`;
  };

  const handleDeleteRecord = async (item: any) => {
    const rawId = item?.id;
    if (rawId == null) return;
    const idValue = typeof rawId === 'number' ? rawId : Number(rawId);
    const idForDelete = Number.isFinite(idValue) ? idValue : String(rawId);

    const confirmText = 'Eliminar este registro relacionado?';
    if (!window.confirm(confirmText)) return;

    setDeletingId(rawId);
    setError(null);

    try {
      switch (openModal) {
        case 'animal_disease':
          await animalDiseasesService.deleteAnimalDisease(String(idForDelete));
          break;
        case 'vaccination':
          await vaccinationsService.deleteVaccination(String(idForDelete));
          break;
      }

      setListData((prev) => prev.filter((row) => row?.id !== rawId));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Error al eliminar el registro');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      switch (openModal) {
        case 'animal_disease':
          if (!formData.animal_id || !formData.disease_id || !formData.instructor_id) {
            throw new Error('Animal, enfermedad e instructor son obligatorios');
          }
          await animalDiseasesService.createAnimalDisease(formData);
          break;
        case 'vaccination':
          if (!formData.animal_id || !formData.vaccine_id) {
            throw new Error('Animal y vacuna son obligatorios');
          }
          await vaccinationsService.createVaccination(formData);
          break;
      }

      handleCloseModal();
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
        <div className="space-y-4">
          <div className="flex justify-end p-4 pb-0">
            <button
              onClick={() => handleOpenModal(openModal, 'create')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Nuevo...
            </button>
          </div>
          <div className="pb-10 text-center">
            {error ? (
              <p className="text-destructive">{error}</p>
            ) : (
              <p className="text-muted-foreground">No hay registros para este usuario</p>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        <div className="flex justify-end mb-2">
          <button
            onClick={() => handleOpenModal(openModal, 'create')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-md transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nuevo...
          </button>
        </div>
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}
        {listData.map((item, index) => (
          <div
            key={item.id || index}
            className="border border-border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex flex-col gap-3">
              {renderListItem(item)}
              <div className="flex justify-end">
                <button
                  onClick={() => handleDeleteRecord(item)}
                  className="inline-flex items-center gap-1.5 text-sm text-destructive hover:text-destructive/80"
                  disabled={deletingId === item?.id}
                >
                  <Trash2 className="h-4 w-4" />
                  {deletingId === item?.id ? 'Eliminando...' : 'Eliminar'}
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
      case 'animal_disease':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Animal:</span>
              <span className="text-muted-foreground">{item.animal_id ? getAnimalLabelForId(item.animal_id) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Enfermedad:</span>
              <span className="text-muted-foreground">{item?.disease?.name || item?.disease_name || item?.disease_id || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Estado:</span>
              <span className={item.status === 'Activo' ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                {item.status || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium text-foreground">Diagnóstico:</span>
              <span className="text-muted-foreground">
                {item.diagnosis_date ? new Date(item.diagnosis_date).toLocaleDateString('es-ES') : '-'}
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

      case 'vaccination':
        {
          const roleLabel = item.instructor_id === user.id ? 'Instructor' : item.apprentice_id === user.id ? 'Aprendiz' : 'N/A';
          return (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Animal:</span>
                <span className="text-muted-foreground">{item.animal_id ? getAnimalLabelForId(item.animal_id) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Vacuna:</span>
                <span className="text-muted-foreground">{item?.vaccine?.name || item?.vaccines?.name || item.vaccine_id || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Fecha:</span>
                <span className="text-muted-foreground">
                  {item.application_date || item.vaccination_date ? new Date(item.application_date || item.vaccination_date).toLocaleDateString('es-ES') : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-foreground">Rol:</span>
                <span className="text-muted-foreground">{roleLabel}</span>
              </div>
            </div>
          );
        }

      default:
        return null;
    }
  };

  const renderFormContent = () => {
    const inputClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";
    const labelClass = "block text-sm font-medium mb-1.5 text-foreground";
    const selectClass = "w-full px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors";

    switch (openModal) {
      case 'animal_disease':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Instructor</label>
              <input
                type="text"
                value={user.fullname || `ID ${user.id}`}
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

      case 'vaccination':
        return (
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Usuario</label>
              <input
                type="text"
                value={`${user.fullname} (${user.role})`}
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

      default:
        return null;
    }
  };

  const getModalTitle = () => {
    switch (openModal) {
      case 'animal_disease':
        return modalMode === 'create' ? 'Registrar Enfermedad' : 'Enfermedades Asignadas';
      case 'vaccination':
        return modalMode === 'create' ? 'Registrar Vacunación' : 'Vacunaciones Realizadas';
      default:
        return '';
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
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Activity className="mr-2 h-4 w-4" />
              Enfermedades
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
              <Syringe className="mr-2 h-4 w-4" />
              Vacunaciones
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
        </DropdownMenuContent>
      </DropdownMenu>

      <GenericModal
        isOpen={openModal !== null}
        onOpenChange={(open) => !open && handleCloseModal()}
        title={getModalTitle()}
        description={modalMode === 'list' ? `Registros del usuario ${user.fullname || user.id}` : undefined}
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
