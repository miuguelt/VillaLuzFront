import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminCRUDPage, CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/ui/common/AdminCRUDPage';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import type { TreatmentResponse, TreatmentInput, TreatmentVaccineResponse, TreatmentMedicationResponse, VaccineResponse, MedicationResponse } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalLink } from '@/shared/ui/common/ForeignKeyHelpers';
import { useToast } from '@/app/providers/ToastContext';
import { Badge } from '@/shared/ui/badge';
import { ConfirmDialog } from '@/shared/ui/common/ConfirmDialog';
import { Checkbox } from '@/shared/ui/checkbox';
import { Toolbar } from '@/shared/ui/common/Toolbar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/ui/tabs';

// MOVIDO: columnas se declaran dentro del componente para poder usar openAssociations
const AdminTreatmentsPage: React.FC = () => {
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Estado para modal de insumos (vacunas/medicamentos)
  const [assocOpen, setAssocOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentResponse | null>(null);
  const [vaccines, setVaccines] = useState<TreatmentVaccineResponse[]>([]);
  const [medications, setMedications] = useState<TreatmentMedicationResponse[]>([]);
  const [loadingAssoc, setLoadingAssoc] = useState(false);
  const [assocError, setAssocError] = useState<string | null>(null);

  // Estados para añadir vacuna/medicamento
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [vaccineOptions, setVaccineOptions] = useState<{ value: number; label: string }[]>([]);
  const [medicationOptions, setMedicationOptions] = useState<{ value: number; label: string }[]>([]);
  const [newVaccines, setNewVaccines] = useState<number[]>([]);
  const [newMedications, setNewMedications] = useState<number[]>([]);
  const [vaccineSearch, setVaccineSearch] = useState('');
  const [medicationSearch, setMedicationSearch] = useState('');
  const [vaccineDoseMap, setVaccineDoseMap] = useState<Record<number, string>>({});
  const [savingVaccine, setSavingVaccine] = useState(false);
  const [savingMedication, setSavingMedication] = useState(false);
  const [newVaccineError, setNewVaccineError] = useState<string | null>(null);
  const [newMedicationError, setNewMedicationError] = useState<string | null>(null);

  // Estados para tarjeta de detalle de selección
  const [selectedVaccineInfo, setSelectedVaccineInfo] = useState<VaccineResponse | null>(null);
  const [selectedMedicationInfo, setSelectedMedicationInfo] = useState<MedicationResponse | null>(null);
  const [loadingVaccineInfo, setLoadingVaccineInfo] = useState(false);
  const [loadingMedicationInfo, setLoadingMedicationInfo] = useState(false);
  const [deleteLoadingId, setDeleteLoadingId] = useState<{ type: 'vaccine' | 'medication'; id: number } | null>(null);
  const { showToast } = useToast();
  const [vaccPage, setVaccPage] = useState(1);
  const [medPage, setMedPage] = useState(1);
  const [vaccPageSize, setVaccPageSize] = useState(5);
  const [medPageSize, setMedPageSize] = useState(5);
  const [confirmDeleteVaccineOpen, setConfirmDeleteVaccineOpen] = useState(false);
  const [confirmDeleteMedicationOpen, setConfirmDeleteMedicationOpen] = useState(false);
  const [pendingDeleteVaccine, setPendingDeleteVaccine] = useState<any | null>(null);
  const [pendingDeleteMedication, setPendingDeleteMedication] = useState<any | null>(null);
  const vaccineLabelById = useMemo(() => {
    const map = new Map<number, string>();
    (vaccineOptions || []).forEach((o) => map.set(Number(o.value), o.label));
    return map;
  }, [vaccineOptions]);
  const medicationLabelById = useMemo(() => {
    const map = new Map<number, string>();
    (medicationOptions || []).forEach((o) => map.set(Number(o.value), o.label));
    return map;
  }, [medicationOptions]);
  const [vaccineRouteMap, setVaccineRouteMap] = useState<Record<number, string>>({});
  const [vaccListSearch, setVaccListSearch] = useState('');
  const [medListSearch, setMedListSearch] = useState('');
  const [vaccSort, setVaccSort] = useState<'recent' | 'oldest' | 'name_asc' | 'name_desc'>('recent');
  const [medSort, setMedSort] = useState<'recent' | 'oldest' | 'name_asc' | 'name_desc'>('recent');
  const [selectedVaccIds, setSelectedVaccIds] = useState<number[]>([]);
  const [selectedMedIds, setSelectedMedIds] = useState<number[]>([]);
  const [vaccShowOnlySelected, setVaccShowOnlySelected] = useState(false);
  const [medShowOnlySelected, setMedShowOnlySelected] = useState(false);
  const [savingBulkVacc, setSavingBulkVacc] = useState(false);
  const [savingBulkMed, setSavingBulkMed] = useState(false);
  const [bulkVaccForm, setBulkVaccForm] = useState<{ dose?: string; notes?: string } | null>(null);
  const [bulkMedForm, setBulkMedForm] = useState<{ dosage?: string; frequency?: string; duration_days?: number; administration_route?: string; notes?: string } | null>(null);
  const [confirmBulkDeleteVaccOpen, setConfirmBulkDeleteVaccOpen] = useState(false);
  const [confirmBulkDeleteMedOpen, setConfirmBulkDeleteMedOpen] = useState(false);
  const optionsLoadedRef = React.useRef(false);
  const optionsLoadingRef = React.useRef<Promise<void> | null>(null);
  const associationsLoadingRef = React.useRef<Promise<void> | null>(null);
  const associationsIdRef = React.useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await animalsService.getAnimals?.();
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        const options = (items || []).map((a: any) => ({ value: a.id, label: a.record || a.tag || `ID ${a.id}` }));
        setAnimalOptions(options);
      } catch (e) {
        // noop
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Crear mapa de búsqueda optimizado
  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);
  const refreshAssociations = useCallback(async (treatmentId: number, bypassCache: boolean = false) => {
    if (!treatmentId) return;
    if (!bypassCache && associationsLoadingRef.current && associationsIdRef.current === treatmentId) {
      return associationsLoadingRef.current;
    }

    setLoadingAssoc(true);
    setAssocError(null);
    associationsIdRef.current = treatmentId;

    const req = (async () => {
      try {
        const params: any = { treatment_id: treatmentId, limit: 100 };
        if (bypassCache) {
          params.cache_bust = Date.now();
        }

        const [vaccRes, medRes] = await Promise.all([
          (treatmentVaccinesService as any).getAll?.(params).catch(() => []),
          (treatmentMedicationService as any).getAll?.(params).catch(() => []),
        ]);
        setVaccines(Array.isArray(vaccRes) ? vaccRes : (vaccRes as any)?.data || []);
        setMedications(Array.isArray(medRes) ? medRes : (medRes as any)?.data || []);
      } catch (err) {
        setAssocError('No se pudieron cargar los insumos del tratamiento.');
      } finally {
        setLoadingAssoc(false);
      }
    })();

    associationsLoadingRef.current = req;
    try {
      await req;
    } finally {
      if (associationsLoadingRef.current === req) {
        associationsLoadingRef.current = null;
        associationsIdRef.current = null;
      }
    }
  }, []);

  const loadOptions = useCallback(async () => {
    if (optionsLoadedRef.current) return;
    if (optionsLoadingRef.current) return optionsLoadingRef.current;
    const req = (async () => {
      try {
        const [vaccList, medList] = await Promise.all([
          (vaccinesService as any).getAll?.({ limit: 200 }).catch(async () => (vaccinesService as any).getVaccines?.({ limit: 200 })),
          (medicationsService as any).getAll?.({ limit: 200 }).catch(async () => (medicationsService as any).getMedications?.({ limit: 200 })),
        ]);
        const vaccData = Array.isArray(vaccList) ? vaccList : (vaccList as any)?.data || [];
        const medData = Array.isArray(medList) ? medList : (medList as any)?.data || [];
        setVaccineOptions((vaccData || []).map((v: any) => ({ value: v.id, label: v.name || `Vacuna ${v.id}` })));
        setMedicationOptions((medData || []).map((m: any) => ({ value: m.id, label: m.name || `Medicamento ${m.id}` })));
        const doseEntries: [number, string][] = (vaccData || []).map((v: any) => {
          const dose = (v as any).dosis ?? (v as any).dose ?? '';
          return [Number(v.id), typeof dose === 'string' && dose.trim() ? String(dose) : '1 dosis'];
        }).filter(([id]: [number, string]) => !!id);
        const doseMap: Record<number, string> = {};
        doseEntries.forEach(([id, dose]: [number, string]) => { doseMap[id] = dose; });
        setVaccineDoseMap(doseMap);
        const routeEntries: [number, string][] = (vaccData || []).map((v: any) => [Number(v.id), (v as any).route_administration_name || '']).filter(([id, name]: [number, string]) => !!id && !!String(name).trim());
        const routeMap: Record<number, string> = {};
        routeEntries.forEach(([id, name]: [number, string]) => { routeMap[id] = String(name); });
        setVaccineRouteMap(routeMap);
        optionsLoadedRef.current = true;
      } catch (e) {
        // noop
      }
    })();
    optionsLoadingRef.current = req;
    try {
      await req;
    } finally {
      if (optionsLoadingRef.current === req) {
        optionsLoadingRef.current = null;
      }
    }
  }, []);

  const openAssociations = useCallback(async (item: TreatmentResponse) => {
    setSelectedTreatment(item);
    setAssocError(null);
    setVaccines([]);
    setMedications([]);
    setAssocOpen(true);
    setLoadingAssoc(true);
    try {
      await Promise.all([refreshAssociations(item.id), loadOptions()]);
    } finally {
      // refreshAssociations maneja loading
    }
  }, [loadOptions, refreshAssociations]);

  const closeAssociations = () => {
    setAssocOpen(false);
    setSelectedTreatment(null);
    setVaccines([]);
    setMedications([]);
    setAssocError(null);
    setShowAddVaccine(false);
    setShowAddMedication(false);
    setNewVaccines([]);
    setNewMedications([]);
    setNewVaccineError(null);
    setNewMedicationError(null);
    setSelectedVaccineInfo(null);
    setSelectedMedicationInfo(null);
    setSelectedVaccIds([]);
    setSelectedMedIds([]);
    setBulkVaccForm(null);
    setBulkMedForm(null);
  };

  const TreatmentAssociationsPanel: React.FC<{ item: TreatmentResponse & { [k: string]: any } }> = ({ item }) => {
    useEffect(() => {
      if (item && item.id) {
        // Fix: Evitar resetear el estado si ya estamos visualizando el mismo tratamiento.
        // Esto previene que los formularios se cierren o el estado se pierda al re-renderizar el componente padre.
        if (selectedTreatment?.id === item.id) return;

        setSelectedTreatment(item);
        setAssocError(null);
        setShowAddVaccine(false);
        setShowAddMedication(false);
        setNewVaccines([]);
        setNewMedications([]);
        setNewVaccineError(null);
        setNewMedicationError(null);
        setSelectedVaccineInfo(null);
        setSelectedMedicationInfo(null);
        setSelectedVaccIds([]);
        setSelectedMedIds([]);
        setBulkVaccForm(null);
        setBulkMedForm(null);
      }
    }, [item, item?.id, selectedTreatment]);
    useEffect(() => {
      if (item && item.id) {
        void refreshAssociations(item.id);
        void loadOptions();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [item?.id, refreshAssociations, loadOptions]);
    return (
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            <span>
              Tratamiento: <span className="font-medium">#{item?.id}</span>{' '}
              {item?.diagnosis ? `· ${item.diagnosis}` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              className="h-8 px-3 ring-1 ring-white/20 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 hover:shadow-md active:scale-[0.98]"
              onClick={(e) => { e.stopPropagation(); setShowAddVaccine((s) => !s); setShowAddMedication(false); }}
              disabled={!item}
            >
              Añadir vacuna
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="h-8 px-3 ring-1 ring-white/20 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 hover:shadow-md active:scale-[0.98]"
              onClick={(e) => { e.stopPropagation(); setShowAddMedication((s) => !s); setShowAddVaccine(false); }}
              disabled={!item}
            >
              Añadir medicamento
            </Button>
          </div>
        </div>
        {showAddVaccine && item && (
          <form onSubmit={handleCreateVaccine} className="rounded-lg border bg-background/80 p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Vacuna</label>
                <input
                  type="text"
                  className="mb-2 w-full h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Buscar vacuna…"
                  value={vaccineSearch}
                  onChange={(e) => setVaccineSearch(e.target.value)}
                />
                <select
                  aria-label="Seleccionar vacunas"
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  multiple
                  value={newVaccines.map(String)}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions).map((o) => Number(o.value)).filter(Boolean);
                    setNewVaccines(opts);
                    setNewVaccineError(null);
                    if (!opts || opts.length !== 1) {
                      setSelectedVaccineInfo(null);
                      return;
                    }
                    const idNum = Number(opts[0]);
                    if (!idNum) {
                      setSelectedVaccineInfo(null);
                      return;
                    }
                    setLoadingVaccineInfo(true);
                    (async () => {
                      try {
                        const info = await vaccinesService.getVaccineById(String(idNum));
                        setSelectedVaccineInfo(info as any);
                      } catch (_) {
                        setSelectedVaccineInfo(null);
                      } finally {
                        setLoadingVaccineInfo(false);
                      }
                    })();
                  }}
                  required
                >
                  {vaccineOptions
                    .filter((opt) => opt.label.toLowerCase().includes(vaccineSearch.toLowerCase()))
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" className="h-9" disabled={savingVaccine}>
                  {savingVaccine ? 'Guardando…' : 'Guardar vacuna(s)'}
                </Button>
                <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => { setShowAddVaccine(false); setNewVaccines([]); setNewVaccineError(null); setSelectedVaccineInfo(null); }}>
                  Cancelar
                </Button>
              </div>
            </div>
            {loadingVaccineInfo && (
              <div className="text-xs text-muted-foreground">Cargando información de la vacuna…</div>
            )}
            {selectedVaccineInfo && !loadingVaccineInfo && (
              <Card className="bg-card text-card-foreground border border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selectedVaccineInfo.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedVaccineInfo.type && <p><span className="font-medium">Tipo:</span> {selectedVaccineInfo.type}</p>}
                    {selectedVaccineInfo.dosis && <p><span className="font-medium">Dosis:</span> {selectedVaccineInfo.dosis}</p>}
                    {selectedVaccineInfo.route_administration_name && <p><span className="font-medium">Ruta Admin.:</span> {selectedVaccineInfo.route_administration_name}</p>}
                    {typeof selectedVaccineInfo.vaccination_interval !== 'undefined' && <p><span className="font-medium">Intervalo (días):</span> {String(selectedVaccineInfo.vaccination_interval)}</p>}
                    {selectedVaccineInfo.target_disease_name && <p><span className="font-medium">Enfermedad objetivo:</span> {selectedVaccineInfo.target_disease_name}</p>}
                    {typeof selectedVaccineInfo.national_plan !== 'undefined' && <p><span className="font-medium">Plan Nacional:</span> {selectedVaccineInfo.national_plan ? 'Sí' : 'No'}</p>}
                  </div>
                </CardContent>
              </Card>
            )}
            {newVaccineError && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">{newVaccineError}</div>
            )}
          </form>
        )}
        {showAddMedication && item && (
          <form onSubmit={handleCreateMedication} className="rounded-lg border bg-background/80 p-3 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Medicamento</label>
                <input
                  type="text"
                  className="mb-2 w-full h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  placeholder="Buscar medicamento…"
                  value={medicationSearch}
                  onChange={(e) => setMedicationSearch(e.target.value)}
                />
                <select
                  aria-label="Seleccionar medicamentos"
                  className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                  multiple
                  value={newMedications.map(String)}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions).map((o) => Number(o.value)).filter(Boolean);
                    setNewMedications(opts);
                    setNewMedicationError(null);
                    if (!opts || opts.length !== 1) {
                      setSelectedMedicationInfo(null);
                      return;
                    }
                    const idNum = Number(opts[0]);
                    if (!idNum) {
                      setSelectedMedicationInfo(null);
                      return;
                    }
                    setLoadingMedicationInfo(true);
                    (async () => {
                      try {
                        const info = await medicationsService.getMedicationById(String(idNum));
                        setSelectedMedicationInfo(info as any);
                      } catch (_) {
                        setSelectedMedicationInfo(null);
                      } finally {
                        setLoadingMedicationInfo(false);
                      }
                    })();
                  }}
                  required
                >
                  {medicationOptions
                    .filter((opt) => opt.label.toLowerCase().includes(medicationSearch.toLowerCase()))
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button type="submit" size="sm" className="h-9" disabled={savingMedication}>
                  {savingMedication ? 'Guardando…' : 'Guardar medicamento(s)'}
                </Button>
                <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => { setShowAddMedication(false); setNewMedications([]); setNewMedicationError(null); setSelectedMedicationInfo(null); }}>
                  Cancelar
                </Button>
              </div>
            </div>
            {loadingMedicationInfo && (
              <div className="text-xs text-muted-foreground">Cargando información del medicamento…</div>
            )}
            {selectedMedicationInfo && !loadingMedicationInfo && (
              <Card className="bg-card text-card-foreground border border-border/60 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selectedMedicationInfo.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {selectedMedicationInfo.description && <p><span className="font-medium">Descripción:</span> {selectedMedicationInfo.description}</p>}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {selectedMedicationInfo.dosage_form && <p><span className="font-medium">Forma farmacéutica:</span> {selectedMedicationInfo.dosage_form}</p>}
                    {selectedMedicationInfo.concentration && <p><span className="font-medium">Concentración:</span> {selectedMedicationInfo.concentration}</p>}
                    {selectedMedicationInfo.manufacturer && <p><span className="font-medium">Fabricante:</span> {selectedMedicationInfo.manufacturer}</p>}
                    {typeof selectedMedicationInfo.withdrawal_period_days !== 'undefined' && <p><span className="font-medium">Periodo de retiro (días):</span> {String(selectedMedicationInfo.withdrawal_period_days)}</p>}
                    {selectedMedicationInfo.storage_conditions && <p><span className="font-medium">Almacenamiento:</span> {selectedMedicationInfo.storage_conditions}</p>}
                  </div>
                  {selectedMedicationInfo.contraindications && <p><span className="font-medium">Contraindicaciones:</span> {selectedMedicationInfo.contraindications}</p>}
                </CardContent>
              </Card>
            )}
            {newMedicationError && (
              <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">{newMedicationError}</div>
            )}
          </form>
        )}
        {assocError && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
            {assocError}
          </div>
        )}
        {loadingAssoc ? (
          <div className="py-10 text-center text-muted-foreground">Cargando insumos…</div>
        ) : (
          <>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Vacunas</h3>
                  <Badge variant="muted">{sortedVaccines.length}</Badge>
                </div>
                {sortedVaccines && sortedVaccines.length > 0 ? (
                  <div>
                    {bulkVaccForm && (
                      <form onSubmit={submitBulkVaccEdit} className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Dosis"
                          value={bulkVaccForm.dose ?? ''}
                          onChange={(e) => setBulkVaccForm((s) => ({ ...(s || {}), dose: e.target.value }))}
                        />
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Notas"
                          value={bulkVaccForm.notes ?? ''}
                          onChange={(e) => setBulkVaccForm((s) => ({ ...(s || {}), notes: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <Button type="submit" size="sm" disabled={savingBulkVacc}>
                            {savingBulkVacc ? 'Guardando…' : 'Guardar cambios'}
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setBulkVaccForm(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    )}
                    <div className="relative max-h-[38vh] overflow-y-auto pr-1">
                      <Toolbar
                        searchPlaceholder="Filtrar vacunas…"
                        searchValue={vaccListSearch}
                        onSearchChange={setVaccListSearch}
                        className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-2 mb-2"
                        right={
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectAllVaccOnPage}
                              disabled={paginatedVaccines.length === 0}
                            >
                              Seleccionar pág.
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={clearVaccSelection}
                              disabled={selectedVaccIds.length === 0}
                            >
                              Limpiar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmBulkDeleteVaccOpen(true)}
                              disabled={selectedVaccIds.length === 0 || savingBulkVacc}
                            >
                              {savingBulkVacc ? 'Desvinculando…' : `Desvincular (${selectedVaccIds.length})`}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBulkVaccForm({})}
                              disabled={selectedVaccIds.length === 0}
                            >
                              Editar en lote
                            </Button>
                          </div>
                        }
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={vaccShowOnlySelected}
                            onCheckedChange={(v) => setVaccShowOnlySelected(Boolean(v))}
                          />
                          Mostrar solo seleccionados
                        </label>
                        <select
                          aria-label="Ordenar vacunas"
                          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          value={vaccSort}
                          onChange={(e) => setVaccSort(e.target.value as any)}
                        >
                          <option value="recent">Más recientes</option>
                          <option value="oldest">Más antiguos</option>
                          <option value="name_asc">Nombre A–Z</option>
                          <option value="name_desc">Nombre Z–A</option>
                        </select>
                      </Toolbar>
                      <ul className="space-y-2 text-sm">
                        {paginatedVaccines.map((v: any) => (
                          <li key={v.id ?? `${v.vaccine_id}-${v.treatment_id}-${Math.random()}`} className="flex flex-col gap-2 rounded-md border p-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Seleccionar vacuna ${v.vaccine_name ?? v.id}`}
                                    className="h-4 w-4"
                                    checked={selectedVaccIds.includes(Number(v.id))}
                                    onChange={() => toggleVaccSelected(Number(v.id))}
                                    disabled={!v?.id}
                                  />
                                  <div className="font-medium truncate">Vacuna {v.vaccine_name ?? `#${v.vaccine_id ?? v.id}`}</div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {v.vaccination_status && <Badge variant="info">{String(v.vaccination_status)}</Badge>}
                                  {v.scheduled_date && <Badge variant="outline">Programada: {new Date(String(v.scheduled_date)).toLocaleDateString('es-ES')}</Badge>}
                                  {v.administered_date && <Badge variant="success">Aplicada: {new Date(String(v.administered_date)).toLocaleDateString('es-ES')}</Badge>}
                                  {v.expiry_date && <Badge variant="warning">Vence: {new Date(String(v.expiry_date)).toLocaleDateString('es-ES')}</Badge>}
                                  {v.vaccine_id && vaccineRouteMap[Number(v.vaccine_id)] && <Badge variant="secondary">Ruta: {vaccineRouteMap[Number(v.vaccine_id)]}</Badge>}
                                </div>
                                {v.dose && (
                                  <div className="text-muted-foreground">Dosis: {String(v.dose)}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); openDeleteVaccine(v); }}
                                  disabled={deleteLoadingId?.type === 'vaccine' && deleteLoadingId.id === v?.id}
                                >
                                  {deleteLoadingId?.type === 'vaccine' && deleteLoadingId.id === v?.id ? 'Desvinculando…' : 'Desvincular'}
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Página {vaccPage} de {totalVaccPages}</div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Elementos por página (vacunas)"
                          className="h-8 rounded-md border bg-background px-2 text-sm"
                          value={vaccPageSize}
                          onChange={(e) => { setVaccPageSize(Number(e.target.value)); setVaccPage(1); }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVaccPage((p) => Math.max(1, p - 1))}
                          disabled={vaccPage <= 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVaccPage((p) => Math.min(totalVaccPages, p + 1))}
                          disabled={vaccPage >= totalVaccPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No hay vacunas asociadas.</div>
                )}
              </div>
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Medicamentos</h3>
                  <Badge variant="muted">{sortedMedications.length}</Badge>
                </div>
                {sortedMedications && sortedMedications.length > 0 ? (
                  <div>
                    {bulkMedForm && (
                      <form onSubmit={submitBulkMedEdit} className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Dosis"
                          value={bulkMedForm.dosage ?? ''}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), dosage: e.target.value }))}
                        />
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Frecuencia"
                          value={bulkMedForm.frequency ?? ''}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), frequency: e.target.value }))}
                        />
                        <input
                          type="number"
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Días"
                          value={typeof bulkMedForm.duration_days !== 'undefined' ? Number(bulkMedForm.duration_days) : undefined as any}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), duration_days: e.target.value ? Number(e.target.value) : undefined }))}
                        />
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Vía de administración"
                          value={bulkMedForm.administration_route ?? ''}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), administration_route: e.target.value }))}
                        />
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Notas"
                          value={bulkMedForm.notes ?? ''}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), notes: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <Button type="submit" size="sm" disabled={savingBulkMed}>
                            {savingBulkMed ? 'Guardando…' : 'Guardar cambios'}
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setBulkMedForm(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    )}
                    <div className="relative max-h-[38vh] overflow-y-auto pr-1">
                      <Toolbar
                        searchPlaceholder="Filtrar medicamentos…"
                        searchValue={medListSearch}
                        onSearchChange={setMedListSearch}
                        className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-2 mb-2"
                        right={
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectAllMedOnPage}
                              disabled={paginatedMedications.length === 0}
                            >
                              Seleccionar pág.
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={clearMedSelection}
                              disabled={selectedMedIds.length === 0}
                            >
                              Limpiar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmBulkDeleteMedOpen(true)}
                              disabled={selectedMedIds.length === 0 || savingBulkMed}
                            >
                              {savingBulkMed ? 'Desvinculando…' : `Desvincular (${selectedMedIds.length})`}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBulkMedForm({})}
                              disabled={selectedMedIds.length === 0}
                            >
                              Editar en lote
                            </Button>
                          </div>
                        }
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={medShowOnlySelected}
                            onCheckedChange={(v) => setMedShowOnlySelected(Boolean(v))}
                          />
                          Mostrar solo seleccionados
                        </label>
                        <select
                          aria-label="Ordenar medicamentos"
                          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          value={medSort}
                          onChange={(e) => setMedSort(e.target.value as any)}
                        >
                          <option value="recent">Más recientes</option>
                          <option value="oldest">Más antiguos</option>
                          <option value="name_asc">Nombre A–Z</option>
                          <option value="name_desc">Nombre Z–A</option>
                        </select>
                      </Toolbar>
                      <ul className="space-y-2 text-sm">
                        {paginatedMedications.map((m: any) => (
                          <li key={m.id ?? `${m.medication_id}-${m.treatment_id}-${Math.random()}`} className="flex flex-col gap-2 rounded-md border p-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Seleccionar medicamento ${m.medication_name ?? m.id}`}
                                    className="h-4 w-4"
                                    checked={selectedMedIds.includes(Number(m.id))}
                                    onChange={() => toggleMedSelected(Number(m.id))}
                                    disabled={!m?.id}
                                  />
                                  <div className="font-medium truncate">Medicamento {m.medication_name ?? `#${m.medication_id ?? m.id}`}</div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {(m.dosage ?? m.dose) && <Badge variant="outline">Dosis: {String(m.dosage ?? m.dose)}</Badge>}
                                  {m.frequency && <Badge variant="secondary">Frecuencia: {String(m.frequency)}</Badge>}
                                  {m.duration_days && <Badge variant="secondary">Días: {String(m.duration_days)}</Badge>}
                                  {m.administration_route && <Badge variant="info">Vía: {String(m.administration_route)}</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); openDeleteMedication(m); }}
                                  disabled={deleteLoadingId?.type === 'medication' && deleteLoadingId.id === m?.id}
                                >
                                  {deleteLoadingId?.type === 'medication' && deleteLoadingId.id === m?.id ? 'Desvinculando…' : 'Desvincular'}
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Página {medPage} de {totalMedPages}</div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Elementos por página (medicamentos)"
                          className="h-8 rounded-md border bg-background px-2 text-sm"
                          value={medPageSize}
                          onChange={(e) => { setMedPageSize(Number(e.target.value)); setMedPage(1); }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMedPage((p) => Math.max(1, p - 1))}
                          disabled={medPage <= 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMedPage((p) => Math.min(totalMedPages, p + 1))}
                          disabled={medPage >= totalMedPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No hay medicamentos asociados.</div>
                )}
              </div>
            </div>
            <div className="lg:hidden">
              <Tabs defaultValue="vacunas">
                <TabsList className="w-full">
                  <TabsTrigger value="vacunas">Vacunas</TabsTrigger>
                  <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
                </TabsList>
                <TabsContent value="vacunas">
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">Vacunas</h3>
                      <Badge variant="muted">{sortedVaccines.length}</Badge>
                    </div>
                    {sortedVaccines && sortedVaccines.length > 0 ? (
                      <div>
                        {bulkVaccForm && (
                          <form onSubmit={submitBulkVaccEdit} className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              placeholder="Dosis"
                              value={bulkVaccForm.dose ?? ''}
                              onChange={(e) => setBulkVaccForm((s) => ({ ...(s || {}), dose: e.target.value }))}
                            />
                            <input
                              className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              placeholder="Notas"
                              value={bulkVaccForm.notes ?? ''}
                              onChange={(e) => setBulkVaccForm((s) => ({ ...(s || {}), notes: e.target.value }))}
                            />
                            <div className="flex items-center gap-2">
                              <Button type="submit" size="sm" disabled={savingBulkVacc}>
                                {savingBulkVacc ? 'Guardando…' : 'Guardar cambios'}
                              </Button>
                              <Button type="button" variant="secondary" size="sm" onClick={() => setBulkVaccForm(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        )}
                        <div className="relative max-h-[38vh] overflow-y-auto pr-1">
                          <Toolbar
                            searchPlaceholder="Filtrar vacunas…"
                            searchValue={vaccListSearch}
                            onSearchChange={setVaccListSearch}
                            className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-2 mb-2"
                            right={
                              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={selectAllVaccOnPage}
                                  disabled={paginatedVaccines.length === 0}
                                  className="w-full sm:w-auto whitespace-nowrap"
                                >
                                  Seleccionar pág.
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={clearVaccSelection}
                                  disabled={selectedVaccIds.length === 0}
                                  className="w-full sm:w-auto whitespace-nowrap"
                                >
                                  Limpiar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setConfirmBulkDeleteVaccOpen(true)}
                                  disabled={selectedVaccIds.length === 0 || savingBulkVacc}
                                  className="w-full sm:w-auto col-span-2 sm:col-span-1 whitespace-nowrap"
                                >
                                  {savingBulkVacc ? 'Desvinculando…' : `Desvincular (${selectedVaccIds.length})`}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setBulkVaccForm({})}
                                  disabled={selectedVaccIds.length === 0}
                                  className="w-full sm:w-auto col-span-2 sm:col-span-1 whitespace-nowrap"
                                >
                                  Editar lote
                                </Button>
                              </div>
                            }
                          >
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={vaccShowOnlySelected}
                                onCheckedChange={(v) => setVaccShowOnlySelected(Boolean(v))}
                              />
                              Mostrar solo seleccionados
                            </label>
                            <select
                              aria-label="Ordenar vacunas"
                              className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              value={vaccSort}
                              onChange={(e) => setVaccSort(e.target.value as any)}
                            >
                              <option value="recent">Más recientes</option>
                              <option value="oldest">Más antiguos</option>
                              <option value="name_asc">Nombre A–Z</option>
                              <option value="name_desc">Nombre Z–A</option>
                            </select>
                          </Toolbar>
                          <ul className="space-y-2 text-sm">
                            {paginatedVaccines.map((v: any) => (
                              <li key={v.id ?? `${v.vaccine_id}-${v.treatment_id}-${Math.random()}`} className="flex flex-col gap-2 rounded-md border p-2">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        aria-label={`Seleccionar vacuna ${v.vaccine_name ?? v.id}`}
                                        className="h-4 w-4"
                                        checked={selectedVaccIds.includes(Number(v.id))}
                                        onChange={() => toggleVaccSelected(Number(v.id))}
                                        disabled={!v?.id}
                                      />
                                      <div className="font-medium truncate">Vacuna {v.vaccine_name ?? `#${v.vaccine_id ?? v.id}`}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {v.vaccination_status && <Badge variant="info">{String(v.vaccination_status)}</Badge>}
                                      {v.scheduled_date && <Badge variant="outline">Programada: {new Date(String(v.scheduled_date)).toLocaleDateString('es-ES')}</Badge>}
                                      {v.administered_date && <Badge variant="success">Aplicada: {new Date(String(v.administered_date)).toLocaleDateString('es-ES')}</Badge>}
                                      {v.expiry_date && <Badge variant="warning">Vence: {new Date(String(v.expiry_date)).toLocaleDateString('es-ES')}</Badge>}
                                      {v.vaccine_id && vaccineRouteMap[Number(v.vaccine_id)] && <Badge variant="secondary">Ruta: {vaccineRouteMap[Number(v.vaccine_id)]}</Badge>}
                                    </div>
                                    {v.dose && (
                                      <div className="text-muted-foreground">Dosis: {String(v.dose)}</div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); openDeleteVaccine(v); }}
                                      disabled={deleteLoadingId?.type === 'vaccine' && deleteLoadingId.id === v?.id}
                                    >
                                      {deleteLoadingId?.type === 'vaccine' && deleteLoadingId.id === v?.id ? 'Desvinculando…' : 'Desvincular'}
                                    </Button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">Página {vaccPage} de {totalVaccPages}</div>
                          <div className="flex items-center gap-2">
                            <select
                              aria-label="Elementos por página (vacunas)"
                              className="h-8 rounded-md border bg-background px-2 text-sm"
                              value={vaccPageSize}
                              onChange={(e) => { setVaccPageSize(Number(e.target.value)); setVaccPage(1); }}
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                            </select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVaccPage((p) => Math.max(1, p - 1))}
                              disabled={vaccPage <= 1}
                            >
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setVaccPage((p) => Math.min(totalVaccPages, p + 1))}
                              disabled={vaccPage >= totalVaccPages}
                            >
                              Siguiente
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No hay vacunas asociadas.</div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="medicamentos">
                  <div className="rounded-lg border bg-background p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">Medicamentos</h3>
                      <Badge variant="muted">{sortedMedications.length}</Badge>
                    </div>
                    {sortedMedications && sortedMedications.length > 0 ? (
                      <div>
                        {bulkMedForm && (
                          <form onSubmit={submitBulkMedEdit} className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input
                              className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              placeholder="Dosis"
                              value={bulkMedForm.dosage ?? ''}
                              onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), dosage: e.target.value }))}
                            />
                            <input
                              className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              placeholder="Frecuencia"
                              value={bulkMedForm.frequency ?? ''}
                              onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), frequency: e.target.value }))}
                            />
                            <input
                              type="number"
                              className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              placeholder="Días"
                              value={typeof bulkMedForm.duration_days !== 'undefined' ? Number(bulkMedForm.duration_days) : undefined as any}
                              onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), duration_days: e.target.value ? Number(e.target.value) : undefined }))}
                            />
                            <input
                              className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              placeholder="Vía de administración"
                              value={bulkMedForm.administration_route ?? ''}
                              onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), administration_route: e.target.value }))}
                            />
                            <input
                              className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              placeholder="Notas"
                              value={bulkMedForm.notes ?? ''}
                              onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), notes: e.target.value }))}
                            />
                            <div className="flex items-center gap-2">
                              <Button type="submit" size="sm" disabled={savingBulkMed}>
                                {savingBulkMed ? 'Guardando…' : 'Guardar cambios'}
                              </Button>
                              <Button type="button" variant="secondary" size="sm" onClick={() => setBulkMedForm(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        )}
                        <div className="relative max-h-[38vh] overflow-y-auto pr-1">
                          <Toolbar
                            searchPlaceholder="Filtrar medicamentos…"
                            searchValue={medListSearch}
                            onSearchChange={setMedListSearch}
                            className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-2 mb-2"
                            right={
                              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={selectAllMedOnPage}
                                  disabled={paginatedMedications.length === 0}
                                  className="w-full sm:w-auto whitespace-nowrap"
                                >
                                  Seleccionar pág.
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={clearMedSelection}
                                  disabled={selectedMedIds.length === 0}
                                  className="w-full sm:w-auto whitespace-nowrap"
                                >
                                  Limpiar
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setConfirmBulkDeleteMedOpen(true)}
                                  disabled={selectedMedIds.length === 0 || savingBulkMed}
                                  className="w-full sm:w-auto col-span-2 sm:col-span-1 whitespace-nowrap"
                                >
                                  {savingBulkMed ? 'Desvinculando…' : `Desvincular (${selectedMedIds.length})`}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setBulkMedForm({})}
                                  disabled={selectedMedIds.length === 0}
                                  className="w-full sm:w-auto col-span-2 sm:col-span-1 whitespace-nowrap"
                                >
                                  Editar lote
                                </Button>
                              </div>
                            }
                          >
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={medShowOnlySelected}
                                onCheckedChange={(v) => setMedShowOnlySelected(Boolean(v))}
                              />
                              Mostrar solo seleccionados
                            </label>
                            <select
                              aria-label="Ordenar medicamentos"
                              className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                              value={medSort}
                              onChange={(e) => setMedSort(e.target.value as any)}
                            >
                              <option value="recent">Más recientes</option>
                              <option value="oldest">Más antiguos</option>
                              <option value="name_asc">Nombre A–Z</option>
                              <option value="name_desc">Nombre Z–A</option>
                            </select>
                          </Toolbar>
                          <ul className="space-y-2 text-sm">
                            {paginatedMedications.map((m: any) => (
                              <li key={m.id ?? `${m.medication_id}-${m.treatment_id}-${Math.random()}`} className="flex flex-col gap-2 rounded-md border p-2">
                                <div className="flex items-start justify-between">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        aria-label={`Seleccionar medicamento ${m.medication_name ?? m.id}`}
                                        className="h-4 w-4"
                                        checked={selectedMedIds.includes(Number(m.id))}
                                        onChange={() => toggleMedSelected(Number(m.id))}
                                        disabled={!m?.id}
                                      />
                                      <div className="font-medium truncate">Medicamento {m.medication_name ?? `#${m.medication_id ?? m.id}`}</div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {(m.dosage ?? m.dose) && <Badge variant="outline">Dosis: {String(m.dosage ?? m.dose)}</Badge>}
                                      {m.frequency && <Badge variant="secondary">Frecuencia: {String(m.frequency)}</Badge>}
                                      {m.duration_days && <Badge variant="secondary">Días: {String(m.duration_days)}</Badge>}
                                      {m.administration_route && <Badge variant="info">Vía: {String(m.administration_route)}</Badge>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); openDeleteMedication(m); }}
                                      disabled={deleteLoadingId?.type === 'medication' && deleteLoadingId.id === m?.id}
                                    >
                                      {deleteLoadingId?.type === 'medication' && deleteLoadingId.id === m?.id ? 'Desvinculando…' : 'Desvincular'}
                                    </Button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">Página {medPage} de {totalMedPages}</div>
                          <div className="flex items-center gap-2">
                            <select
                              aria-label="Elementos por página (medicamentos)"
                              className="h-8 rounded-md border bg-background px-2 text-sm"
                              value={medPageSize}
                              onChange={(e) => { setMedPageSize(Number(e.target.value)); setMedPage(1); }}
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                            </select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMedPage((p) => Math.max(1, p - 1))}
                              disabled={medPage <= 1}
                            >
                              Anterior
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setMedPage((p) => Math.min(totalMedPages, p + 1))}
                              disabled={medPage >= totalMedPages}
                            >
                              Siguiente
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No hay medicamentos asociados.</div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </>
        )}
        <ConfirmDialog
          open={confirmBulkDeleteVaccOpen}
          onOpenChange={setConfirmBulkDeleteVaccOpen}
          title="Desvincular vacunas seleccionadas"
          description="Esta acción desvinculará todas las asociaciones seleccionadas del tratamiento."
          onConfirm={async () => {
            if (!selectedTreatment) return;
            setSavingBulkVacc(true);
            try {
              await Promise.all(selectedVaccIds.map((id) => (treatmentVaccinesService as any).deleteTreatmentVaccine(String(id))));
              await refreshAssociations(selectedTreatment.id, true);
              const names = selectedVaccIds.map(getVaccNameByAssocId);
              setSelectedVaccIds([]);
              showToast(`Vacuna(s) desvinculadas: ${names.join(', ')}`, 'success');
            } catch {
              showToast('Error al eliminar vacunas seleccionadas', 'error');
            } finally {
              setSavingBulkVacc(false);
              setConfirmBulkDeleteVaccOpen(false);
            }
          }}
          confirmLabel="Desvincular"
          confirmVariant="destructive"
        />
        <ConfirmDialog
          open={confirmBulkDeleteMedOpen}
          onOpenChange={setConfirmBulkDeleteMedOpen}
          title="Desvincular medicamentos seleccionados"
          description="Esta acción desvinculará todas las asociaciones seleccionadas del tratamiento."
          onConfirm={async () => {
            if (!selectedTreatment) return;
            setSavingBulkMed(true);
            try {
              await Promise.all(selectedMedIds.map((id) => (treatmentMedicationService as any).deleteTreatmentMedication(String(id))));
              await refreshAssociations(selectedTreatment.id, true);
              const names = selectedMedIds.map(getMedNameByAssocId);
              setSelectedMedIds([]);
              showToast(`Medicamento(s) desvinculados: ${names.join(', ')}`, 'success');
            } catch {
              showToast('Error al eliminar medicamentos seleccionados', 'error');
            } finally {
              setSavingBulkMed(false);
              setConfirmBulkDeleteMedOpen(false);
            }
          }}
          confirmLabel="Desvincular"
          confirmVariant="destructive"
        />
        <ConfirmDialog
          open={confirmDeleteVaccineOpen}
          onOpenChange={setConfirmDeleteVaccineOpen}
          title="Desvincular vacuna del tratamiento"
          description={pendingDeleteVaccine ? `¿Deseas desvincular la vacuna ${pendingDeleteVaccine.vaccine_name ?? (pendingDeleteVaccine.vaccine_id ? (vaccineLabelById.get(Number(pendingDeleteVaccine.vaccine_id)) || `#${pendingDeleteVaccine.vaccine_id}`) : `#${pendingDeleteVaccine.id}`)} del tratamiento?` : '¿Deseas desvincular esta vacuna?'}
          confirmLabel="Desvincular"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteVaccine}
          confirmVariant="destructive"
          size="sm"
        />
        <ConfirmDialog
          open={confirmDeleteMedicationOpen}
          onOpenChange={setConfirmDeleteMedicationOpen}
          title="Desvincular medicamento del tratamiento"
          description={pendingDeleteMedication ? `¿Deseas desvincular el medicamento ${pendingDeleteMedication.medication_name ?? (pendingDeleteMedication.medication_id ? (medicationLabelById.get(Number(pendingDeleteMedication.medication_id)) || `#${pendingDeleteMedication.medication_id}`) : `#${pendingDeleteMedication.id}`)} del tratamiento?` : '¿Deseas desvincular este medicamento?'}
          confirmLabel="Desvincular"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteMedication}
          confirmVariant="destructive"
          size="sm"
        />
      </div>
    );
  };



  const openDeleteVaccine = (v: any) => {
    // Obtener el ID del registro de la tabla intermedia (no el vaccine_id del catálogo)
    const recordId = v?.id ?? v?.treatment_vaccine_id ?? v?.association_id;
    console.log('[openDeleteVaccine] Called with:', { v, recordId });
    if (!recordId) {
      console.warn('[openDeleteVaccine] No valid ID found, cannot delete');
      showToast('Error: No se encontró el ID del registro para desvincular', 'error');
      return;
    }
    // Guardamos el objeto con el ID normalizado
    setPendingDeleteVaccine({ ...v, _resolvedId: recordId });
    setConfirmDeleteVaccineOpen(true);
  };
  const confirmDeleteVaccine = async () => {
    const recordId = pendingDeleteVaccine?._resolvedId ?? pendingDeleteVaccine?.id;
    if (!recordId || !selectedTreatment) {
      console.error('[confirmDeleteVaccine] Missing recordId or selectedTreatment');
      return;
    }
    setDeleteLoadingId({ type: 'vaccine', id: recordId });
    try {
      console.log('[confirmDeleteVaccine] Deleting treatment vaccine with ID:', recordId);
      await (treatmentVaccinesService as any).deleteTreatmentVaccine(String(recordId));
      await refreshAssociations(selectedTreatment.id, true);
      const label = pendingDeleteVaccine.vaccine_name ?? (pendingDeleteVaccine.vaccine_id ? (vaccineLabelById.get(Number(pendingDeleteVaccine.vaccine_id)) || `#${pendingDeleteVaccine.vaccine_id}`) : `#${recordId}`);
      showToast(`Vacuna ${label} desvinculada`, 'success');
    } catch (err) {
      console.error('[confirmDeleteVaccine] Error:', err);
      showToast('Error al desvincular la vacuna', 'error');
    } finally {
      setDeleteLoadingId(null);
      setPendingDeleteVaccine(null);
      setConfirmDeleteVaccineOpen(false);
    }
  };



  const openDeleteMedication = (m: any) => {
    // Obtener el ID del registro de la tabla intermedia (no el medication_id del catálogo)
    const recordId = m?.id ?? m?.treatment_medication_id ?? m?.association_id;
    console.log('[openDeleteMedication] Called with:', { m, recordId });
    if (!recordId) {
      console.warn('[openDeleteMedication] No valid ID found, cannot delete');
      showToast('Error: No se encontró el ID del registro para desvincular', 'error');
      return;
    }
    // Guardamos el objeto con el ID normalizado
    setPendingDeleteMedication({ ...m, _resolvedId: recordId });
    setConfirmDeleteMedicationOpen(true);
  };
  const confirmDeleteMedication = async () => {
    const recordId = pendingDeleteMedication?._resolvedId ?? pendingDeleteMedication?.id;
    if (!recordId || !selectedTreatment) {
      console.error('[confirmDeleteMedication] Missing recordId or selectedTreatment');
      return;
    }
    setDeleteLoadingId({ type: 'medication', id: recordId });
    try {
      console.log('[confirmDeleteMedication] Deleting treatment medication with ID:', recordId);
      await (treatmentMedicationService as any).deleteTreatmentMedication(String(recordId));
      await refreshAssociations(selectedTreatment.id, true);
      const label = pendingDeleteMedication.medication_name ?? (pendingDeleteMedication.medication_id ? (medicationLabelById.get(Number(pendingDeleteMedication.medication_id)) || `#${pendingDeleteMedication.medication_id}`) : `#${recordId}`);
      showToast(`Medicamento ${label} desvinculado`, 'success');
    } catch (err) {
      console.error('[confirmDeleteMedication] Error:', err);
      showToast('Error al desvincular el medicamento', 'error');
    } finally {
      setDeleteLoadingId(null);
      setPendingDeleteMedication(null);
      setConfirmDeleteMedicationOpen(false);
    }
  };

  const handleCreateVaccine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatment) return;
    setNewVaccineError(null);
    if (!Array.isArray(newVaccines) || newVaccines.length === 0) {
      setNewVaccineError('Selecciona una vacuna.');
      return;
    }
    const selectedIds = newVaccines.filter((id) => !!id);
    const existingIds = (vaccines || []).map((v: any) => Number(v.vaccine_id)).filter(Boolean);
    const toCreateIds = selectedIds.filter((id) => !existingIds.includes(Number(id)));
    if (toCreateIds.length === 0) {
      setNewVaccineError('Todas las vacunas seleccionadas ya están asociadas.');
      return;
    }
    setSavingVaccine(true);
    try {
      const payload = toCreateIds.map((id) => ({
        treatment_id: selectedTreatment.id,
        vaccine_id: id,
        dose: vaccineDoseMap[id] ?? '1 dosis',
      }));
      if (payload.length === 1) {
        await treatmentVaccinesService.createTreatmentVaccine(payload[0] as any);
      } else {
        await (treatmentVaccinesService as any).createBulk(payload as any);
      }
      await refreshAssociations(selectedTreatment.id, true);
      setShowAddVaccine(false);
      setNewVaccines([]);
      setSelectedVaccineInfo(null);
      const names = toCreateIds.map((id) => vaccineLabelById.get(Number(id)) || `#${id}`);
      showToast(`Vacuna(s) asociadas: ${names.join(', ')}`, 'success');
    } catch (err: any) {
      console.error('Error al crear tratamiento-vacuna:', err);
      const apiMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
      setNewVaccineError(apiMsg ? `No se pudo añadir la vacuna: ${typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg)}` : 'No se pudo añadir la vacuna al tratamiento.');
      showToast('No se pudo añadir la vacuna al tratamiento', 'error');
    } finally {
      setSavingVaccine(false);
    }
  };

  const handleCreateMedication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatment) return;
    setNewMedicationError(null);
    if (!Array.isArray(newMedications) || newMedications.length === 0) {
      setNewMedicationError('Selecciona un medicamento.');
      return;
    }
    const selectedIds = newMedications.filter((id) => !!id);
    const existingIds = (medications || []).map((m: any) => Number(m.medication_id)).filter(Boolean);
    const toCreateIds = selectedIds.filter((id) => !existingIds.includes(Number(id)));
    if (toCreateIds.length === 0) {
      setNewMedicationError('Todos los medicamentos seleccionados ya están asociados.');
      return;
    }
    setSavingMedication(true);
    try {
      const payload = toCreateIds.map((id) => ({
        treatment_id: selectedTreatment.id,
        medication_id: id,
      }));
      if (payload.length === 1) {
        await treatmentMedicationService.createTreatmentMedication(payload[0] as any);
      } else {
        await (treatmentMedicationService as any).createBulk(payload as any);
      }
      await refreshAssociations(selectedTreatment.id, true);
      setShowAddMedication(false);
      setNewMedications([]);
      setSelectedMedicationInfo(null);
      const names = toCreateIds.map((id) => medicationLabelById.get(Number(id)) || `#${id}`);
      showToast(`Medicamento(s) asociados: ${names.join(', ')}`, 'success');
    } catch (err: any) {
      setNewMedicationError('No se pudo añadir el medicamento al tratamiento.');
      showToast('No se pudo añadir el medicamento al tratamiento', 'error');
    } finally {
      setSavingMedication(false);
    }
  };

  const sortedVaccines = useMemo(() => {
    let arr = [...(vaccines || [])];
    const q = vaccListSearch.toLowerCase().trim();
    if (q) {
      arr = arr.filter((v: any) => {
        const name = String(v.vaccine_name ?? (v.vaccine_id ? (vaccineLabelById.get(Number(v.vaccine_id)) || '') : ''));
        const route = v.vaccine_id ? vaccineRouteMap[Number(v.vaccine_id)] : '';
        const fields = [name, v.dose, v.notes, v.vaccination_status, route]
          .map((x) => String(x || '').toLowerCase());
        return fields.some((s) => s.includes(q));
      });
    }
    arr.sort((a: any, b: any) => {
      if (vaccSort === 'name_asc' || vaccSort === 'name_desc') {
        const an = String(a.vaccine_name ?? (a.vaccine_id ? (vaccineLabelById.get(Number(a.vaccine_id)) || '') : '')).toLowerCase();
        const bn = String(b.vaccine_name ?? (b.vaccine_id ? (vaccineLabelById.get(Number(b.vaccine_id)) || '') : '')).toLowerCase();
        const cmp = an.localeCompare(bn);
        return vaccSort === 'name_asc' ? cmp : -cmp;
      }
      const ad = a.updated_at || a.created_at || '';
      const bd = b.updated_at || b.created_at || '';
      if (ad && bd) {
        const diff = new Date(ad as string).getTime() - new Date(bd as string).getTime();
        return vaccSort === 'oldest' ? diff : -diff;
      }
      const ai = Number(a.id || a.vaccine_id || 0);
      const bi = Number(b.id || b.vaccine_id || 0);
      return vaccSort === 'oldest' ? ai - bi : bi - ai;
    });
    return arr;
  }, [vaccines, vaccListSearch, vaccSort, vaccineLabelById, vaccineRouteMap]);
  const sortedMedications = useMemo(() => {
    let arr = [...(medications || [])];
    const q = medListSearch.toLowerCase().trim();
    if (q) {
      arr = arr.filter((m: any) => {
        const name = String(m.medication_name ?? (m.medication_id ? (medicationLabelById.get(Number(m.medication_id)) || '') : ''));
        const fields = [name, m.dosage ?? m.dose, m.frequency, m.duration_days, m.administration_route, m.notes]
          .map((x) => String(x || '').toLowerCase());
        return fields.some((s) => s.includes(q));
      });
    }
    arr.sort((a: any, b: any) => {
      if (medSort === 'name_asc' || medSort === 'name_desc') {
        const an = String(a.medication_name ?? (a.medication_id ? (medicationLabelById.get(Number(a.medication_id)) || '') : '')).toLowerCase();
        const bn = String(b.medication_name ?? (b.medication_id ? (medicationLabelById.get(Number(b.medication_id)) || '') : '')).toLowerCase();
        const cmp = an.localeCompare(bn);
        return medSort === 'name_asc' ? cmp : -cmp;
      }
      const ad = a.updated_at || a.created_at || '';
      const bd = b.updated_at || b.created_at || '';
      if (ad && bd) {
        const diff = new Date(ad as string).getTime() - new Date(bd as string).getTime();
        return medSort === 'oldest' ? diff : -diff;
      }
      const ai = Number(a.id || a.medication_id || 0);
      const bi = Number(b.id || b.medication_id || 0);
      return medSort === 'oldest' ? ai - bi : bi - ai;
    });
    return arr;
  }, [medications, medListSearch, medSort, medicationLabelById]);
  const visibleVaccines = useMemo(() => {
    const base = sortedVaccines;
    return vaccShowOnlySelected ? base.filter((v: any) => selectedVaccIds.includes(Number(v.id))) : base;
  }, [sortedVaccines, vaccShowOnlySelected, selectedVaccIds]);
  const visibleMedications = useMemo(() => {
    const base = sortedMedications;
    return medShowOnlySelected ? base.filter((m: any) => selectedMedIds.includes(Number(m.id))) : base;
  }, [sortedMedications, medShowOnlySelected, selectedMedIds]);
  const toggleVaccSelected = (id?: number) => {
    const n = Number(id || 0);
    if (!n) return;
    setSelectedVaccIds((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  };
  const toggleMedSelected = (id?: number) => {
    const n = Number(id || 0);
    if (!n) return;
    setSelectedMedIds((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]);
  };
  const selectAllVaccOnPage = () => {
    const ids = paginatedVaccines.map((v: any) => Number(v.id)).filter(Boolean);
    setSelectedVaccIds((prev) => Array.from(new Set([...prev, ...ids])));
  };
  const selectAllMedOnPage = () => {
    const ids = paginatedMedications.map((m: any) => Number(m.id)).filter(Boolean);
    setSelectedMedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };
  const clearVaccSelection = () => setSelectedVaccIds([]);
  const clearMedSelection = () => setSelectedMedIds([]);
  const getVaccNameByAssocId = (assocId: number): string => {
    const v = (vaccines || []).find((vv: any) => Number(vv.id) === Number(assocId));
    return v?.vaccine_name ?? (v?.vaccine_id ? (vaccineLabelById.get(Number(v.vaccine_id)) || `#${v.vaccine_id}`) : `#${assocId}`);
  };
  const getMedNameByAssocId = (assocId: number): string => {
    const m = (medications || []).find((mm: any) => Number(mm.id) === Number(assocId));
    return m?.medication_name ?? (m?.medication_id ? (medicationLabelById.get(Number(m.medication_id)) || `#${m.medication_id}`) : `#${assocId}`);
  };
  const confirmBulkDeleteVacc = async () => {
    if (!selectedTreatment || selectedVaccIds.length === 0) return;
    setSavingBulkVacc(true);
    try {
      await Promise.all(selectedVaccIds.map((id) => (treatmentVaccinesService as any).deleteTreatmentVaccine(String(id))));
      await refreshAssociations(selectedTreatment.id, true);
      const names = selectedVaccIds.map(getVaccNameByAssocId);
      setSelectedVaccIds([]);
      showToast(`Vacuna(s) desvinculadas: ${names.join(', ')}`, 'success');
    } catch (err) {
      showToast('Error al desvincular vacunas seleccionadas', 'error');
    } finally {
      setSavingBulkVacc(false);
      setConfirmBulkDeleteVaccOpen(false);
    }
  };
  const confirmBulkDeleteMed = async () => {
    if (!selectedTreatment || selectedMedIds.length === 0) return;
    setSavingBulkMed(true);
    try {
      await Promise.all(selectedMedIds.map((id) => (treatmentMedicationService as any).deleteTreatmentMedication(String(id))));
      await refreshAssociations(selectedTreatment.id, true);
      const names = selectedMedIds.map(getMedNameByAssocId);
      setSelectedMedIds([]);
      showToast(`Medicamento(s) desvinculados: ${names.join(', ')}`, 'success');
    } catch (err) {
      showToast('Error al desvincular medicamentos seleccionados', 'error');
    } finally {
      setSavingBulkMed(false);
      setConfirmBulkDeleteMedOpen(false);
    }
  };
  const submitBulkVaccEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatment || !bulkVaccForm || selectedVaccIds.length === 0) return;
    const payload: any = {};
    if (typeof bulkVaccForm.dose !== 'undefined' && String(bulkVaccForm.dose).trim()) payload.dose = bulkVaccForm.dose;
    if (typeof bulkVaccForm.notes !== 'undefined' && String(bulkVaccForm.notes).trim()) payload.notes = bulkVaccForm.notes;
    if (Object.keys(payload).length === 0) {
      showToast('Completa algún campo para editar en lote', 'warning');
      return;
    }
    const vaccSelected = (vaccines || []).filter((vv: any) => selectedVaccIds.includes(Number(vv.id)));
    const newDose = typeof payload.dose !== 'undefined' ? String(payload.dose).trim() : undefined;
    const newNotes = typeof payload.notes !== 'undefined' ? String(payload.notes).trim() : undefined;
    const hasAnyChange = vaccSelected.some((vv: any) => {
      const currDose = String(vv.dose ?? '').trim();
      const currNotes = String(vv.notes ?? '').trim();
      return (newDose !== undefined && newDose !== currDose) || (newNotes !== undefined && newNotes !== currNotes);
    });
    if (!hasAnyChange) {
      showToast('Los cambios no modifican ningún elemento seleccionado', 'warning');
      return;
    }
    setSavingBulkVacc(true);
    try {
      await Promise.all(selectedVaccIds.map((id) => (treatmentVaccinesService as any).patchTreatmentVaccine(String(id), payload)));
      await refreshAssociations(selectedTreatment.id, true);
      const names = selectedVaccIds.map(getVaccNameByAssocId);
      setBulkVaccForm(null);
      setSelectedVaccIds([]);
      showToast(`Vacuna(s) actualizadas: ${names.join(', ')}`, 'success');
    } catch (err) {
      showToast('Error al actualizar vacunas seleccionadas', 'error');
    } finally {
      setSavingBulkVacc(false);
    }
  };
  const submitBulkMedEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTreatment || !bulkMedForm || selectedMedIds.length === 0) return;
    const payload: any = {};
    if (typeof bulkMedForm.dosage !== 'undefined' && String(bulkMedForm.dosage).trim()) payload.dosage = bulkMedForm.dosage;
    if (typeof bulkMedForm.frequency !== 'undefined' && String(bulkMedForm.frequency).trim()) payload.frequency = bulkMedForm.frequency;
    if (typeof bulkMedForm.duration_days !== 'undefined' && Number(bulkMedForm.duration_days)) payload.duration_days = Number(bulkMedForm.duration_days);
    if (typeof bulkMedForm.administration_route !== 'undefined' && String(bulkMedForm.administration_route).trim()) payload.administration_route = bulkMedForm.administration_route;
    if (typeof bulkMedForm.notes !== 'undefined' && String(bulkMedForm.notes).trim()) payload.notes = bulkMedForm.notes;
    if (Object.keys(payload).length === 0) {
      showToast('Completa algún campo para editar en lote', 'warning');
      return;
    }
    const medSelected = (medications || []).filter((mm: any) => selectedMedIds.includes(Number(mm.id)));
    const newDosage = typeof payload.dosage !== 'undefined' ? String(payload.dosage).trim() : undefined;
    const newFrequency = typeof payload.frequency !== 'undefined' ? String(payload.frequency).trim() : undefined;
    const newDays = typeof payload.duration_days !== 'undefined' ? Number(payload.duration_days) : undefined;
    const newRoute = typeof payload.administration_route !== 'undefined' ? String(payload.administration_route).trim() : undefined;
    const newNotesMed = typeof payload.notes !== 'undefined' ? String(payload.notes).trim() : undefined;
    const hasAnyChangeMed = medSelected.some((mm: any) => {
      const currDosage = String((mm.dosage ?? mm.dose) ?? '').trim();
      const currFrequency = String(mm.frequency ?? '').trim();
      const currDays = typeof mm.duration_days !== 'undefined' ? Number(mm.duration_days) : undefined;
      const currRoute = String(mm.administration_route ?? '').trim();
      const currNotes = String(mm.notes ?? '').trim();
      return (
        (newDosage !== undefined && newDosage !== currDosage) ||
        (newFrequency !== undefined && newFrequency !== currFrequency) ||
        (typeof newDays !== 'undefined' && newDays !== currDays) ||
        (newRoute !== undefined && newRoute !== currRoute) ||
        (newNotesMed !== undefined && newNotesMed !== currNotes)
      );
    });
    if (!hasAnyChangeMed) {
      showToast('Los cambios no modifican ningún elemento seleccionado', 'warning');
      return;
    }
    setSavingBulkMed(true);
    try {
      await Promise.all(selectedMedIds.map((id) => (treatmentMedicationService as any).patchTreatmentMedication(String(id), payload)));
      await refreshAssociations(selectedTreatment.id, true);
      const names = selectedMedIds.map(getMedNameByAssocId);
      setBulkMedForm(null);
      setSelectedMedIds([]);
      showToast(`Medicamento(s) actualizados: ${names.join(', ')}`, 'success');
    } catch (err) {
      showToast('Error al actualizar medicamentos seleccionados', 'error');
    } finally {
      setSavingBulkMed(false);
    }
  };
  useEffect(() => { setVaccPage(1); }, [sortedVaccines.length]);
  useEffect(() => { setMedPage(1); }, [sortedMedications.length]);
  const totalVaccPages = useMemo(() => Math.max(1, Math.ceil((visibleVaccines.length || 0) / vaccPageSize)), [visibleVaccines.length, vaccPageSize]);
  const totalMedPages = useMemo(() => Math.max(1, Math.ceil((visibleMedications.length || 0) / medPageSize)), [visibleMedications.length, medPageSize]);
  const paginatedVaccines = useMemo(() => {
    const start = (vaccPage - 1) * vaccPageSize;
    return visibleVaccines.slice(start, start + vaccPageSize);
  }, [visibleVaccines, vaccPage, vaccPageSize]);
  const paginatedMedications = useMemo(() => {
    const start = (medPage - 1) * medPageSize;
    return visibleMedications.slice(start, start + medPageSize);
  }, [visibleMedications, medPage, medPageSize]);

  const columns: CRUDColumn<TreatmentResponse & { [k: string]: any }>[] = useMemo(() => [
    {
      key: 'action' as any,
      label: '',
      sortable: false,
      render: (_v, item) => (
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 whitespace-nowrap ring-1 ring-white/20 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 hover:shadow-md hover:bg-white/10 active:scale-[0.98] cursor-pointer"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); openAssociations(item); }}
          title="ver tratamiento"
          aria-label="ver tratamiento"
        >
          ver tratamiento
        </Button>
      ),
    },
    {
      key: 'animal_id' as any,
      label: 'Animal',
      render: (value: any) => {
        if (!value) return '-';
        const id = Number(value);
        const label = animalMap.get(id) || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      }
    },
    { key: 'treatment_date' as any, label: 'Fecha de tratamiento', render: (v) => (v ? new Date(String(v)).toLocaleDateString('es-ES') : '-') },
    { key: 'description' as any, label: 'Descripción', render: (_v, item) => { const d = String((item as any).description ?? '').trim(); return d ? (item as any).description : ((item as any).diagnosis ?? '-'); } },
    { key: 'dosis' as any, label: 'Dosis', render: (_v, item) => (item as any).dosis ?? (item as any).dose ?? '-' },
    { key: 'frequency' as any, label: 'Frecuencia', render: (_v, item) => (item as any).frequency ?? (item as any).frecuencia ?? '-' },
    { key: 'observations' as any, label: 'Observaciones', render: (_v, item) => (item as any).observations ?? (item as any).notes ?? '-' },
    { key: 'created_at' as any, label: 'Creado', render: (v) => (v ? new Date(String(v)).toLocaleString('es-ES') : '-') },
  ], [animalMap, openAssociations]);

  const formSectionsLocal: CRUDFormSection<TreatmentInput & { [k: string]: any }>[] = [
    {
      title: 'Información básica',
      gridCols: 2,
      fields: [
        { name: 'animal_id' as any, label: 'Animal', type: 'select', required: true, options: animalOptions, placeholder: 'Seleccionar animal' },
        { name: 'treatment_date' as any, label: 'Fecha de tratamiento', type: 'date', required: true },
        { name: 'diagnosis' as any, label: 'Diagnóstico', type: 'text', required: true, placeholder: 'Ej: Fiebre, infección...' },
        { name: 'description' as any, label: 'Descripción', type: 'textarea', placeholder: 'Descripción del tratamiento', colSpan: 2 },
        { name: 'dosis' as any, label: 'Dosis', type: 'text', placeholder: 'Ej: 10ml' },

        { name: 'frequency' as any, label: 'Frecuencia', type: 'text', placeholder: 'Ej: Una vez' },
        { name: 'observations' as any, label: 'Observaciones', type: 'textarea', placeholder: 'Observaciones', colSpan: 2 },
      ],
    },
  ];

  const crudConfigLocal: CRUDConfig<TreatmentResponse & { [k: string]: any }, TreatmentInput & { [k: string]: any }> = {
    title: 'Tratamientos',
    entityName: 'Tratamiento',
    columns,
    formSections: formSectionsLocal,
    searchPlaceholder: 'Buscar tratamientos...',
    emptyStateMessage: 'No hay tratamientos registrados.',
    emptyStateDescription: 'Crea el primer registro para comenzar.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    // Evitamos timestamps automáticos del detalle/edición porque ya mostramos created_at como columna
    showDetailTimestamps: false,
    showEditTimestamps: false,
    // Ocultar id en el título del detalle
    showIdInDetailTitle: false,
  };

  // No renderizar hasta que las opciones estén cargadas para evitar mostrar IDs
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando tratamientos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminCRUDPage
        config={crudConfigLocal}
        service={treatmentsService}
        initialFormData={buildInitialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        customDetailContent={(item) => <TreatmentAssociationsPanel item={item as any} />}
        realtime={true}
        pollIntervalMs={0}
        refetchOnFocus={false}
        refetchOnReconnect={true}
        cache={true}
        cacheTTL={300000}
        enhancedHover={true}
      />

      {/* Modal de Insumos (Vacunas y Medicamentos) */}
      <GenericModal
        isOpen={assocOpen}
        onOpenChange={(open) => (open ? setAssocOpen(true) : closeAssociations())}
        title={
          selectedTreatment
            ? `Insumos del tratamiento ${selectedTreatment.id ?? ''}`
            : 'Insumos del tratamiento'
        }
        size="2xl"
        enableBackdropBlur
        description="Vacunas y medicamentos asociados al tratamiento seleccionado"
        className="bg-card/60 backdrop-blur-md text-card-foreground border border-border/40 shadow-xl"
      >
        <div className="space-y-4">
          {/* Acciones para añadir */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {selectedTreatment ? (
                <span>
                  Tratamiento seleccionado: <span className="font-medium">#{selectedTreatment.id}</span>{' '}
                  {selectedTreatment.diagnosis ? `· ${selectedTreatment.diagnosis}` : ''}
                </span>
              ) : (
                <span>Selecciona un tratamiento.</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                className="h-8 px-3 ring-1 ring-white/20 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 hover:shadow-md active:scale-[0.98]"
                onClick={(e) => { e.stopPropagation(); setShowAddVaccine((s) => !s); setShowAddMedication(false); }}
                disabled={!selectedTreatment}
              >
                Añadir vacuna
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="h-8 px-3 ring-1 ring-white/20 hover:ring-white/40 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-all duration-150 hover:shadow-md active:scale-[0.98]"
                onClick={(e) => { e.stopPropagation(); setShowAddMedication((s) => !s); setShowAddVaccine(false); }}
                disabled={!selectedTreatment}
              >
                Añadir medicamento
              </Button>
            </div>
          </div>

          {/* Formulario añadir vacuna */}
          {showAddVaccine && selectedTreatment && (
            <form onSubmit={handleCreateVaccine} className="rounded-lg border bg-background/80 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Vacuna</label>
                  <input
                    type="text"
                    className="mb-2 w-full h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="Buscar vacuna…"
                    value={vaccineSearch}
                    onChange={(e) => setVaccineSearch(e.target.value)}
                  />
                  <select
                    aria-label="Seleccionar vacunas"
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    multiple
                    value={newVaccines.map(String)}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions).map((o) => Number(o.value)).filter(Boolean);
                      setNewVaccines(opts);
                      setNewVaccineError(null);
                      if (!opts || opts.length !== 1) {
                        setSelectedVaccineInfo(null);
                        return;
                      }
                      const idNum = Number(opts[0]);
                      if (!idNum) {
                        setSelectedVaccineInfo(null);
                        return;
                      }
                      setLoadingVaccineInfo(true);
                      (async () => {
                        try {
                          const info = await vaccinesService.getVaccineById(String(idNum));
                          setSelectedVaccineInfo(info as any);
                        } catch (_) {
                          setSelectedVaccineInfo(null);
                        } finally {
                          setLoadingVaccineInfo(false);
                        }
                      })();
                    }}
                    required
                  >
                    {vaccineOptions
                      .filter((opt) => opt.label.toLowerCase().includes(vaccineSearch.toLowerCase()))
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm" className="h-9" disabled={savingVaccine}>
                    {savingVaccine ? 'Guardando…' : 'Guardar vacuna(s)'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => { setShowAddVaccine(false); setNewVaccines([]); setNewVaccineError(null); setSelectedVaccineInfo(null); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
              {loadingVaccineInfo && (
                <div className="text-xs text-muted-foreground">Cargando información de la vacuna…</div>
              )}
              {selectedVaccineInfo && !loadingVaccineInfo && (
                <Card className="bg-card text-card-foreground border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{selectedVaccineInfo.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedVaccineInfo.type && <p><span className="font-medium">Tipo:</span> {selectedVaccineInfo.type}</p>}
                      {selectedVaccineInfo.dosis && <p><span className="font-medium">Dosis:</span> {selectedVaccineInfo.dosis}</p>}
                      {selectedVaccineInfo.route_administration_name && <p><span className="font-medium">Ruta Admin.:</span> {selectedVaccineInfo.route_administration_name}</p>}
                      {typeof selectedVaccineInfo.vaccination_interval !== 'undefined' && <p><span className="font-medium">Intervalo (días):</span> {String(selectedVaccineInfo.vaccination_interval)}</p>}
                      {selectedVaccineInfo.target_disease_name && <p><span className="font-medium">Enfermedad objetivo:</span> {selectedVaccineInfo.target_disease_name}</p>}
                      {typeof selectedVaccineInfo.national_plan !== 'undefined' && <p><span className="font-medium">Plan Nacional:</span> {selectedVaccineInfo.national_plan ? 'Sí' : 'No'}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
              {newVaccineError && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">{newVaccineError}</div>
              )}
            </form>
          )}

          {/* Formulario añadir medicamento */}
          {showAddMedication && selectedTreatment && (
            <form onSubmit={handleCreateMedication} className="rounded-lg border bg-background/80 p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Medicamento</label>
                  <input
                    type="text"
                    className="mb-2 w-full h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    placeholder="Buscar medicamento…"
                    value={medicationSearch}
                    onChange={(e) => setMedicationSearch(e.target.value)}
                  />
                  <select
                    aria-label="Seleccionar medicamentos"
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                    multiple
                    value={newMedications.map(String)}
                    onChange={(e) => {
                      const opts = Array.from(e.target.selectedOptions).map((o) => Number(o.value)).filter(Boolean);
                      setNewMedications(opts);
                      setNewMedicationError(null);
                      if (!opts || opts.length !== 1) {
                        setSelectedMedicationInfo(null);
                        return;
                      }
                      const idNum = Number(opts[0]);
                      if (!idNum) {
                        setSelectedMedicationInfo(null);
                        return;
                      }
                      setLoadingMedicationInfo(true);
                      (async () => {
                        try {
                          const info = await medicationsService.getMedicationById(String(idNum));
                          setSelectedMedicationInfo(info as any);
                        } catch (_) {
                          setSelectedMedicationInfo(null);
                        } finally {
                          setLoadingMedicationInfo(false);
                        }
                      })();
                    }}
                    required
                  >
                    {medicationOptions
                      .filter((opt) => opt.label.toLowerCase().includes(medicationSearch.toLowerCase()))
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm" className="h-9" disabled={savingMedication}>
                    {savingMedication ? 'Guardando…' : 'Guardar medicamento(s)'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" className="h-9" onClick={() => { setShowAddMedication(false); setNewMedications([]); setNewMedicationError(null); setSelectedMedicationInfo(null); }}>
                    Cancelar
                  </Button>
                </div>
              </div>
              {loadingMedicationInfo && (
                <div className="text-xs text-muted-foreground">Cargando información del medicamento…</div>
              )}
              {selectedMedicationInfo && !loadingMedicationInfo && (
                <Card className="bg-card text-card-foreground border border-border/60 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{selectedMedicationInfo.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selectedMedicationInfo.description && <p><span className="font-medium">Descripción:</span> {selectedMedicationInfo.description}</p>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedMedicationInfo.dosage_form && <p><span className="font-medium">Forma farmacéutica:</span> {selectedMedicationInfo.dosage_form}</p>}
                      {selectedMedicationInfo.concentration && <p><span className="font-medium">Concentración:</span> {selectedMedicationInfo.concentration}</p>}
                      {selectedMedicationInfo.manufacturer && <p><span className="font-medium">Fabricante:</span> {selectedMedicationInfo.manufacturer}</p>}
                      {typeof selectedMedicationInfo.withdrawal_period_days !== 'undefined' && <p><span className="font-medium">Periodo de retiro (días):</span> {String(selectedMedicationInfo.withdrawal_period_days)}</p>}
                      {selectedMedicationInfo.storage_conditions && <p><span className="font-medium">Almacenamiento:</span> {selectedMedicationInfo.storage_conditions}</p>}
                    </div>
                    {selectedMedicationInfo.contraindications && <p><span className="font-medium">Contraindicaciones:</span> {selectedMedicationInfo.contraindications}</p>}
                  </CardContent>
                </Card>
              )}
              {newMedicationError && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">{newMedicationError}</div>
              )}
            </form>
          )}

          {assocError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
              {assocError}
            </div>
          )}

          {loadingAssoc ? (
            <div className="py-10 text-center text-muted-foreground">Cargando insumos…</div>
          ) : (
            <div className="hidden lg:grid lg:grid-cols-2 gap-4">
              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Vacunas</h3>
                  <Badge variant="muted">{sortedVaccines.length}</Badge>
                </div>
                {sortedVaccines && sortedVaccines.length > 0 ? (
                  <div>
                    {bulkVaccForm && (
                      <form onSubmit={submitBulkVaccEdit} className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Dosis"
                          value={bulkVaccForm.dose ?? ''}
                          onChange={(e) => setBulkVaccForm((s) => ({ ...(s || {}), dose: e.target.value }))}
                        />
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Notas"
                          value={bulkVaccForm.notes ?? ''}
                          onChange={(e) => setBulkVaccForm((s) => ({ ...(s || {}), notes: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <Button type="submit" size="sm" disabled={savingBulkVacc}>
                            {savingBulkVacc ? 'Guardando…' : 'Guardar cambios'}
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setBulkVaccForm(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    )}
                    <div className="relative max-h-[38vh] overflow-y-auto pr-1">
                      <Toolbar
                        searchPlaceholder="Filtrar vacunas…"
                        searchValue={vaccListSearch}
                        onSearchChange={setVaccListSearch}
                        className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-2 mb-2"
                        right={
                          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectAllVaccOnPage}
                              disabled={paginatedVaccines.length === 0}
                              className="w-full sm:w-auto whitespace-nowrap"
                            >
                              Seleccionar pág.
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={clearVaccSelection}
                              disabled={selectedVaccIds.length === 0}
                              className="w-full sm:w-auto whitespace-nowrap"
                            >
                              Limpiar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmBulkDeleteVaccOpen(true)}
                              disabled={selectedVaccIds.length === 0 || savingBulkVacc}
                              className="w-full sm:w-auto col-span-2 sm:col-span-1 whitespace-nowrap"
                            >
                              {savingBulkVacc ? 'Desvinculando…' : `Desvincular (${selectedVaccIds.length})`}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBulkVaccForm({})}
                              disabled={selectedVaccIds.length === 0}
                              className="w-full sm:w-auto col-span-2 sm:col-span-1 whitespace-nowrap"
                            >
                              Editar lote
                            </Button>
                          </div>
                        }
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={vaccShowOnlySelected}
                            onCheckedChange={(v) => setVaccShowOnlySelected(Boolean(v))}
                          />
                          Mostrar solo seleccionados
                        </label>
                        <select
                          aria-label="Ordenar vacunas"
                          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          value={vaccSort}
                          onChange={(e) => setVaccSort(e.target.value as any)}
                        >
                          <option value="recent">Más recientes</option>
                          <option value="oldest">Más antiguos</option>
                          <option value="name_asc">Nombre A–Z</option>
                          <option value="name_desc">Nombre Z–A</option>
                        </select>
                      </Toolbar>
                      <ul className="space-y-2 text-sm">
                        {paginatedVaccines.map((v: any) => (
                          <li key={v.id ?? `${v.vaccine_id}-${v.treatment_id}-${Math.random()}`} className="flex flex-col gap-2 rounded-md border p-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Seleccionar vacuna ${v.vaccine_name ?? v.id}`}
                                    className="h-4 w-4"
                                    checked={selectedVaccIds.includes(Number(v.id))}
                                    onChange={() => toggleVaccSelected(Number(v.id))}
                                    disabled={!v?.id}
                                  />
                                  <div className="font-medium truncate">Vacuna {v.vaccine_name ?? `#${v.vaccine_id ?? v.id}`}</div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {v.vaccination_status && <Badge variant="info">{String(v.vaccination_status)}</Badge>}
                                  {v.scheduled_date && <Badge variant="outline">Programada: {new Date(String(v.scheduled_date)).toLocaleDateString('es-ES')}</Badge>}
                                  {v.administered_date && <Badge variant="success">Aplicada: {new Date(String(v.administered_date)).toLocaleDateString('es-ES')}</Badge>}
                                  {v.expiry_date && <Badge variant="warning">Vence: {new Date(String(v.expiry_date)).toLocaleDateString('es-ES')}</Badge>}
                                  {v.vaccine_id && vaccineRouteMap[Number(v.vaccine_id)] && <Badge variant="secondary">Ruta: {vaccineRouteMap[Number(v.vaccine_id)]}</Badge>}
                                </div>
                                {v.dose && (
                                  <div className="text-muted-foreground">Dosis: {String(v.dose)}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); openDeleteVaccine(v); }}
                                  disabled={deleteLoadingId?.type === 'vaccine' && deleteLoadingId.id === v?.id}
                                >
                                  {deleteLoadingId?.type === 'vaccine' && deleteLoadingId.id === v?.id ? 'Desvinculando…' : 'Desvincular'}
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Página {vaccPage} de {totalVaccPages}</div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Elementos por página de vacunas"
                          className="h-8 rounded-md border bg-background px-2 text-sm"
                          value={vaccPageSize}
                          onChange={(e) => { setVaccPageSize(Number(e.target.value)); setVaccPage(1); }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVaccPage((p) => Math.max(1, p - 1))}
                          disabled={vaccPage <= 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setVaccPage((p) => Math.min(totalVaccPages, p + 1))}
                          disabled={vaccPage >= totalVaccPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No hay vacunas asociadas.</div>
                )}
              </div>

              <div className="rounded-lg border bg-background p-4">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold">Medicamentos</h3>
                  <Badge variant="muted">{sortedMedications.length}</Badge>
                </div>
                {sortedMedications && sortedMedications.length > 0 ? (
                  <div>
                    {bulkMedForm && (
                      <form onSubmit={submitBulkMedEdit} className="mb-2 grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Dosis"
                          value={bulkMedForm.dosage ?? ''}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), dosage: e.target.value }))}
                        />
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Frecuencia"
                          value={bulkMedForm.frequency ?? ''}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), frequency: e.target.value }))}
                        />
                        <input
                          type="number"
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Días"
                          value={typeof bulkMedForm.duration_days !== 'undefined' ? Number(bulkMedForm.duration_days) : undefined as any}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), duration_days: e.target.value ? Number(e.target.value) : undefined }))}
                        />
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Vía de administración"
                          value={bulkMedForm.administration_route ?? ''}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), administration_route: e.target.value }))}
                        />
                        <input
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          placeholder="Notas"
                          value={bulkMedForm.notes ?? ''}
                          onChange={(e) => setBulkMedForm((s) => ({ ...(s || {}), notes: e.target.value }))}
                        />
                        <div className="flex items-center gap-2">
                          <Button type="submit" size="sm" disabled={savingBulkMed}>
                            {savingBulkMed ? 'Guardando…' : 'Guardar cambios'}
                          </Button>
                          <Button type="button" variant="secondary" size="sm" onClick={() => setBulkMedForm(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    )}
                    <div className="relative max-h-[38vh] overflow-y-auto pr-1">
                      <Toolbar
                        searchPlaceholder="Filtrar medicamentos…"
                        searchValue={medListSearch}
                        onSearchChange={setMedListSearch}
                        className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pb-2 mb-2"
                        right={
                          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={selectAllMedOnPage}
                              disabled={paginatedMedications.length === 0}
                              className="w-full sm:w-auto whitespace-nowrap"
                            >
                              Seleccionar pág.
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={clearMedSelection}
                              disabled={selectedMedIds.length === 0}
                              className="w-full sm:w-auto whitespace-nowrap"
                            >
                              Limpiar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmBulkDeleteMedOpen(true)}
                              disabled={selectedMedIds.length === 0 || savingBulkMed}
                              className="w-full sm:w-auto col-span-2 sm:col-span-1 whitespace-nowrap"
                            >
                              {savingBulkMed ? 'Desvinculando…' : `Desvincular (${selectedMedIds.length})`}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setBulkMedForm({})}
                              disabled={selectedMedIds.length === 0}
                              className="w-full sm:w-auto col-span-2 sm:col-span-1 whitespace-nowrap"
                            >
                              Editar lote
                            </Button>
                          </div>
                        }
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={medShowOnlySelected}
                            onCheckedChange={(v) => setMedShowOnlySelected(Boolean(v))}
                          />
                          Mostrar solo seleccionados
                        </label>
                        <select
                          aria-label="Ordenar medicamentos"
                          className="h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
                          value={medSort}
                          onChange={(e) => setMedSort(e.target.value as any)}
                        >
                          <option value="recent">Más recientes</option>
                          <option value="oldest">Más antiguos</option>
                          <option value="name_asc">Nombre A–Z</option>
                          <option value="name_desc">Nombre Z–A</option>
                        </select>
                      </Toolbar>
                      <ul className="space-y-2 text-sm">
                        {paginatedMedications.map((m: any) => (
                          <li key={m.id ?? `${m.medication_id}-${m.treatment_id}-${Math.random()}`} className="flex flex-col gap-2 rounded-md border p-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    aria-label={`Seleccionar medicamento ${m.medication_name ?? m.id}`}
                                    className="h-4 w-4"
                                    checked={selectedMedIds.includes(Number(m.id))}
                                    onChange={() => toggleMedSelected(Number(m.id))}
                                    disabled={!m?.id}
                                  />
                                  <div className="font-medium truncate">Medicamento {m.medication_name ?? `#${m.medication_id ?? m.id}`}</div>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {(m.dosage ?? m.dose) && <Badge variant="outline">Dosis: {String(m.dosage ?? m.dose)}</Badge>}
                                  {m.frequency && <Badge variant="secondary">Frecuencia: {String(m.frequency)}</Badge>}
                                  {m.duration_days && <Badge variant="secondary">Días: {String(m.duration_days)}</Badge>}
                                  {m.administration_route && <Badge variant="info">Vía: {String(m.administration_route)}</Badge>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); openDeleteMedication(m); }}
                                  disabled={deleteLoadingId?.type === 'medication' && deleteLoadingId.id === m?.id}
                                >
                                  {deleteLoadingId?.type === 'medication' && deleteLoadingId.id === m?.id ? 'Desvinculando…' : 'Desvincular'}
                                </Button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">Página {medPage} de {totalMedPages}</div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Elementos por página de medicamentos"
                          className="h-8 rounded-md border bg-background px-2 text-sm"
                          value={medPageSize}
                          onChange={(e) => { setMedPageSize(Number(e.target.value)); setMedPage(1); }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMedPage((p) => Math.max(1, p - 1))}
                          disabled={medPage <= 1}
                        >
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMedPage((p) => Math.min(totalMedPages, p + 1))}
                          disabled={medPage >= totalMedPages}
                        >
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No hay medicamentos asociados.</div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="secondary" onClick={closeAssociations}>
              Cerrar
            </Button>
          </div>
        </div>
        <ConfirmDialog
          open={confirmDeleteVaccineOpen}
          onOpenChange={setConfirmDeleteVaccineOpen}
          title="Desvincular vacuna del tratamiento"
          description={pendingDeleteVaccine ? `¿Deseas desvincular la vacuna ${pendingDeleteVaccine.vaccine_name ?? (pendingDeleteVaccine.vaccine_id ? (vaccineLabelById.get(Number(pendingDeleteVaccine.vaccine_id)) || `#${pendingDeleteVaccine.vaccine_id}`) : `#${pendingDeleteVaccine.id}`)} del tratamiento?` : '¿Deseas desvincular esta vacuna?'}
          confirmLabel="Desvincular"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteVaccine}
          confirmVariant="destructive"
          size="sm"
        />
        <ConfirmDialog
          open={confirmBulkDeleteVaccOpen}
          onOpenChange={setConfirmBulkDeleteVaccOpen}
          title={`Desvincular ${selectedVaccIds.length} vacuna(s) del tratamiento`}
          description={selectedVaccIds.length > 0 ? `Se desvincularán ${selectedVaccIds.length} elementos seleccionados.` : undefined}
          confirmLabel="Desvincular"
          cancelLabel="Cancelar"
          onConfirm={confirmBulkDeleteVacc}
          confirmVariant="destructive"
          size="sm"
        />
        <ConfirmDialog
          open={confirmDeleteMedicationOpen}
          onOpenChange={setConfirmDeleteMedicationOpen}
          title="Desvincular medicamento del tratamiento"
          description={pendingDeleteMedication ? `¿Deseas desvincular el medicamento ${pendingDeleteMedication.medication_name ?? (pendingDeleteMedication.medication_id ? (medicationLabelById.get(Number(pendingDeleteMedication.medication_id)) || `#${pendingDeleteMedication.medication_id}`) : `#${pendingDeleteMedication.id}`)} del tratamiento?` : '¿Deseas desvincular este medicamento?'}
          confirmLabel="Desvincular"
          cancelLabel="Cancelar"
          onConfirm={confirmDeleteMedication}
          confirmVariant="destructive"
          size="sm"
        />
        <ConfirmDialog
          open={confirmBulkDeleteMedOpen}
          onOpenChange={setConfirmBulkDeleteMedOpen}
          title={`Desvincular ${selectedMedIds.length} medicamento(s) del tratamiento`}
          description={selectedMedIds.length > 0 ? `Se desvincularán ${selectedMedIds.length} elementos seleccionados.` : undefined}
          confirmLabel="Desvincular"
          cancelLabel="Cancelar"
          onConfirm={confirmBulkDeleteMed}
          confirmVariant="destructive"
          size="sm"
        />
      </GenericModal>
    </>
  );
};

// Página principal reemplazada por versión con selects dinámicos arriba

export default AdminTreatmentsPage;

// Mapeo respuesta -> formulario (solo Potreros requeridos)
const mapResponseToForm = (item: TreatmentResponse & { [k: string]: any }): TreatmentInput & { [k: string]: any } => ({
  animal_id: item.animal_id ?? (item as any)?.animal?.id,
  treatment_date: (item as any).treatment_date || (item as any).date || '',
  diagnosis: (item as any).diagnosis ?? (item as any).description ?? '',
  description: (item as any).description ?? (item as any).diagnosis ?? '',
  dosis: (item as any).dosis ?? (item as any).dose ?? '',
  frequency: (item as any).frequency ?? (item as any).frecuencia ?? '',
  observations: (item as any).observations ?? (item as any).notes ?? '',
});

// Validación mínima
const validateForm = (formData: TreatmentInput & { [k: string]: any }): string | null => {
  if (!formData.animal_id) return 'El animal es obligatorio.';
  if (!formData.treatment_date || !String(formData.treatment_date).trim()) return 'La fecha de tratamiento es obligatoria.';
  if (!formData.diagnosis || !String(formData.diagnosis).trim()) return 'El diagnóstico es obligatorio.';
  return null;
};

// Datos iniciales (solo Potreros requeridos)
const buildInitialFormData = (): TreatmentInput & { [k: string]: any } => ({
  animal_id: 0,
  treatment_date: getTodayColombia(),
  diagnosis: '',
  description: '',
  dosis: '',
  frequency: '',
  observations: '',
});

