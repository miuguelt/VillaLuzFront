import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { cn } from '@/shared/ui/cn';
import { Settings, Plus, Trash2, Search, Filter, RefreshCw, Syringe, Pill, Save, X, Eye, FileText, CheckSquare, Square, ArrowUpDown } from 'lucide-react';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Toolbar } from '@/shared/ui/common/Toolbar';
import { useToast } from '@/app/providers/ToastContext';
import { TreatmentResponse, VaccineResponse, MedicationResponse, TreatmentVaccineResponse, TreatmentMedicationResponse } from '@/shared/api/generated/swaggerTypes';
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service';
import { medicationsService } from '@/entities/medication/api/medications.service';
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { TreatmentSuppliesCards } from './TreatmentSuppliesCards';
import { ItemDetailModal } from '../animals/ItemDetailModal';
import { ConfirmDialog } from '@/shared/ui/common/ConfirmDialog';

interface TreatmentSuppliesModalProps {
    isOpen: boolean;
    onClose: () => void;
    treatment: TreatmentResponse | null;
    className?: string;
    zIndex?: number;
}

export const TreatmentSuppliesModal: React.FC<TreatmentSuppliesModalProps> = ({
    isOpen,
    onClose,
    treatment,
    className,
    zIndex
}) => {
    const { showToast } = useToast();

    // Data State
    const [vaccines, setVaccines] = useState<TreatmentVaccineResponse[]>([]);
    const [medications, setMedications] = useState<TreatmentMedicationResponse[]>([]);
    const [loadingAssoc, setLoadingAssoc] = useState(false);
    const [assocError, setAssocError] = useState<string | null>(null);

    // Options State
    const [vaccineOptions, setVaccineOptions] = useState<{ value: number; label: string }[]>([]);
    const [medicationOptions, setMedicationOptions] = useState<{ value: number; label: string }[]>([]);
    const [vaccineDoseMap, setVaccineDoseMap] = useState<Record<number, string>>({});

    const [vaccineRouteMap, setVaccineRouteMap] = useState<Record<number, string>>({});
    const [vaccineFullMap, setVaccineFullMap] = useState<Record<number, any>>({});
    const [medicationFullMap, setMedicationFullMap] = useState<Record<number, any>>({});

    // View Detail State
    const [viewDetailItem, setViewDetailItem] = useState<any>(null);
    const [viewDetailType, setViewDetailType] = useState<'vaccine' | 'medication' | null>(null);

    // Create State
    const [showAddVaccine, setShowAddVaccine] = useState(false);
    const [showAddMedication, setShowAddMedication] = useState(false);
    const [vaccineSearch, setVaccineSearch] = useState('');
    const [medicationSearch, setMedicationSearch] = useState('');
    const [newVaccines, setNewVaccines] = useState<number[]>([]);
    const [newMedications, setNewMedications] = useState<number[]>([]);
    const [savingVaccine, setSavingVaccine] = useState(false);
    const [savingMedication, setSavingMedication] = useState(false);
    const [newVaccineError, setNewVaccineError] = useState<string | null>(null);
    const [newMedicationError, setNewMedicationError] = useState<string | null>(null);

    // Detail Info State
    const [selectedVaccineInfo, setSelectedVaccineInfo] = useState<VaccineResponse | null>(null);
    const [selectedMedicationInfo, setSelectedMedicationInfo] = useState<MedicationResponse | null>(null);
    const [loadingVaccineInfo, setLoadingVaccineInfo] = useState(false);
    const [loadingMedicationInfo, setLoadingMedicationInfo] = useState(false);

    // Delete State
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);
    const [deleteLoadingId, setDeleteLoadingId] = useState<{ type: 'vaccine' | 'medication'; id: number } | null>(null);

    // List & Filter State
    const [vaccListSearch, setVaccListSearch] = useState('');
    const [medListSearch, setMedListSearch] = useState('');
    const [vaccSort, setVaccSort] = useState<'recent' | 'oldest' | 'name_asc' | 'name_desc'>('recent');
    const [medSort, setMedSort] = useState<'recent' | 'oldest' | 'name_asc' | 'name_desc'>('recent');
    const [selectedVaccIds, setSelectedVaccIds] = useState<number[]>([]);
    const [selectedMedIds, setSelectedMedIds] = useState<number[]>([]);
    const [vaccShowOnlySelected, setVaccShowOnlySelected] = useState(false);
    const [medShowOnlySelected, setMedShowOnlySelected] = useState(false);

    // Bulk Edit State
    const [savingBulkVacc, setSavingBulkVacc] = useState(false);
    const [savingBulkMed, setSavingBulkMed] = useState(false);
    const [bulkVaccForm, setBulkVaccForm] = useState<{ dose?: string; notes?: string } | null>(null);
    const [bulkMedForm, setBulkMedForm] = useState<{ dosage?: string; frequency?: string; duration_days?: number; administration_route?: string; notes?: string } | null>(null);
    const [confirmBulkDeleteVaccOpen, setConfirmBulkDeleteVaccOpen] = useState(false);
    const [confirmBulkDeleteMedOpen, setConfirmBulkDeleteMedOpen] = useState(false);

    // Single Delete State
    const [pendingDeleteVaccine, setPendingDeleteVaccine] = useState<any | null>(null);
    const [pendingDeleteMedication, setPendingDeleteMedication] = useState<any | null>(null);

    // Pagination
    const [vaccPage, setVaccPage] = useState(1);
    const [medPage, setMedPage] = useState(1);
    const [vaccPageSize, setVaccPageSize] = useState(5);
    const [medPageSize, setMedPageSize] = useState(5);

    // Refs
    const associationsLoadingRef = useRef<Promise<void> | null>(null);
    const associationsIdRef = useRef<number | null>(null);
    const optionsLoadedRef = useRef(false);
    const optionsLoadingRef = useRef<Promise<void> | null>(null);

    // Maps
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

    // Load Options
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

                const vaccMap: Record<number, any> = {};
                (vaccData || []).forEach((v: any) => { vaccMap[v.id] = v; });
                setVaccineFullMap(vaccMap);

                const medMap: Record<number, any> = {};
                (medData || []).forEach((m: any) => { medMap[m.id] = m; });
                setMedicationFullMap(medMap);

                optionsLoadedRef.current = true;
            } catch (e) {
                console.error('Failed to load options', e);
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

    // Fetch Associations
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
                // Helper recursivo para garantizar la carga completa de datos
                const fetchAllItems = async (service: any, method: string, queryParams: any) => {
                    let allData: any[] = [];
                    let page = 1;
                    const ITEMS_PER_PAGE = 50;

                    while (page <= 10) { // Límite de seguridad
                        const p = { ...queryParams, page, limit: ITEMS_PER_PAGE };
                        try {
                            const res = await service[method](p);
                            const list = res.data || (Array.isArray(res) ? res : []);

                            if (!list || list.length === 0) break;

                            // Filtrar duplicados por ID
                            const newItems = list.filter((item: any) => !allData.some((existing) => existing.id === item.id));
                            if (newItems.length === 0) break;

                            allData = [...allData, ...newItems];

                            // IMPORTANT: Removed optimization to force full scan
                            // if (list.length < ITEMS_PER_PAGE) break;
                            page++;
                        } catch (e) {
                            console.error(`Error fetching page ${page}`, e);
                            break;
                        }
                    }
                    return allData;
                };

                const params: any = {
                    treatment_id: treatmentId,
                    treatmentId: treatmentId, // Redundancia
                    sort_by: 'id',
                    sort_order: 'desc',
                    _t: Date.now() // Cache busting agresivo
                };

                if (bypassCache) {
                    params.cache_bust = Date.now();
                }

                console.log('[TreatmentSuppliesModal] Fetching associations with params:', params);

                const [vData, mData] = await Promise.all([
                    fetchAllItems(treatmentVaccinesService, 'getTreatmentVaccines', params),
                    fetchAllItems(treatmentMedicationService, 'getTreatmentMedications', params),
                ]);

                console.log('[TreatmentSuppliesModal] RAW Response Data:', {
                    vaccinesCount: vData.length,
                    medsCount: mData.length,
                    rawData: { vData, mData }
                });

                // INSPECCIÓN DEEP DEBUG PARA GHOST ITEMS
                if (mData.length > 0) {
                    console.log('[GHOST DEBUG] Primer medicamento RAW:', JSON.parse(JSON.stringify(mData[0])));
                    console.log('[GHOST DEBUG] Todos los medicamentos:', mData);
                }
                if (vData.length > 0) {
                    console.log('[GHOST DEBUG] Primera vacuna RAW:', JSON.parse(JSON.stringify(vData[0])));
                }

                // GHOST BUSTER: Filtrar items que sabemos que son fantasmas (dieron 404 al borrar)
                const getGhosts = (): number[] => {
                    try {
                        const store = localStorage.getItem('ghost_items_v1');
                        const map = store ? JSON.parse(store) : {};
                        return map[Number(treatmentId)] || [];
                    } catch { return []; }
                };
                const ghostIds = new Set(getGhosts());

                // FILTRADO ROBUSTO y FILTRADO DE SOFT DELETES
                const tIdStr = String(treatmentId);
                const isNotDeleted = (item: any) => !item.deleted_at && !item.deletedAt;

                const filteredVaccines = vData.filter((v: any) => {
                    const vTId = v.treatment_id ?? v.treatmentId;
                    return String(vTId) === tIdStr && isNotDeleted(v) && !ghostIds.has(v.id);
                });
                const filteredMedications = mData.filter((m: any) => {
                    const mTId = m.treatment_id ?? m.treatmentId;
                    return String(mTId) === tIdStr && isNotDeleted(m) && !ghostIds.has(m.id);
                });

                console.log('[TreatmentSuppliesModal] Datos filtrados:', { filteredVaccines, filteredMedications });

                setVaccines(filteredVaccines);
                setMedications(filteredMedications);
            } catch (err) {
                console.error('[TreatmentSuppliesModal] Error refreshing associations:', err);
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

    // Initial Load
    useEffect(() => {
        if (isOpen && treatment?.id) {
            loadOptions();
            // SIEMPRE forzar recarga fresca al abrir para evitar "items fantasmas" de caché vieja
            refreshAssociations(treatment.id, true);
        }
    }, [isOpen, treatment, loadOptions, refreshAssociations]);

    // Reset State on Close
    useEffect(() => {
        if (!isOpen) {
            setVaccines([]);
            setMedications([]);
            setShowAddVaccine(false);
            setShowAddMedication(false);
            setNewVaccines([]);
            setNewMedications([]);
            setSelectedVaccineInfo(null);
            setSelectedMedicationInfo(null);
            setSelectedVaccIds([]);
            setSelectedMedIds([]);
            setBulkVaccForm(null);
            setBulkMedForm(null);
        }
    }, [isOpen]);

    // --- Handlers ---

    const handleCreateVaccine = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!treatment) return;
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
                treatment_id: treatment.id,
                treatmentId: treatment.id, // Redundancia
                vaccine_id: id,
                dose: vaccineDoseMap[id] ?? '1 dosis',
            }));
            if (payload.length === 1) {
                const res = await treatmentVaccinesService.createTreatmentVaccine(payload[0] as any);
                console.log('[TreatmentSuppliesModal] Creación vacuna exitosa:', res);
            } else {
                const res = await (treatmentVaccinesService as any).createBulk(payload as any);
                console.log('[TreatmentSuppliesModal] Creación bulk vacunas exitosa:', res);
            }
            // INVALIDAR CACHÉ ANTES DE REFRESCAR
            await Promise.all([
                treatmentVaccinesService.clearCache(),
                treatmentMedicationService.clearCache()
            ]);
            // Mayor retardo para asegurar consistencia DB y replicación
            setTimeout(() => {
                refreshAssociations(treatment.id, true);
            }, 1200);

            setShowAddVaccine(false);
            setNewVaccines([]);
            setSelectedVaccineInfo(null);
            const names = toCreateIds.map((id) => vaccineLabelById.get(Number(id)) || `#${id}`);
            showToast(`Vacuna(s) asociadas: ${names.join(', ')}`, 'success');
        } catch (err: any) {
            console.error('Error al crear tratamiento-vacuna:', err);
            const apiMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message;
            setNewVaccineError(apiMsg ? `No se pudo añadir la vacuna: ${typeof apiMsg === 'string' ? apiMsg : JSON.stringify(apiMsg)}` : 'No se pudo añadir la vacuna al tratamiento.');
        } finally {
            setSavingVaccine(false);
        }
    };

    const handleCreateMedication = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!treatment) return;
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
                treatment_id: treatment.id,
                treatmentId: treatment.id, // Redundancia
                medication_id: id,
            }));
            if (payload.length === 1) {
                const res = await treatmentMedicationService.createTreatmentMedication(payload[0] as any);
                console.log('[TreatmentSuppliesModal] Creación medicamento exitosa:', res);
            } else {
                const res = await (treatmentMedicationService as any).createBulk(payload as any);
                console.log('[TreatmentSuppliesModal] Creación bulk medicamentos exitosa:', res);
            }
            // INVALIDAR CACHÉ ANTES DE REFRESCAR
            await Promise.all([
                treatmentVaccinesService.clearCache(),
                treatmentMedicationService.clearCache()
            ]);
            // Mayor retardo para asegurar consistencia DB y replicación
            setTimeout(() => {
                refreshAssociations(treatment.id, true);
            }, 1200);

            setShowAddMedication(false);
            setNewMedications([]);
            setSelectedMedicationInfo(null);
            const names = toCreateIds.map((id) => medicationLabelById.get(Number(id)) || `#${id}`);
            showToast(`Medicamento(s) asociados: ${names.join(', ')}`, 'success');
        } catch (err: any) {
            setNewMedicationError('No se pudo añadir el medicamento al tratamiento.');
        } finally {
            setSavingMedication(false);
        }
    };

    const openDeleteVaccine = async (v: any) => {
        const itemId = v.id;
        if (confirmingDeleteId === itemId) {
            setConfirmingDeleteId(null);
            await confirmDeleteVaccine(v);
        } else {
            setConfirmingDeleteId(itemId);
            showToast('Haz clic de nuevo para desvincular', 'warning');
            setTimeout(() => setConfirmingDeleteId(prev => prev === itemId ? null : prev), 3000);
        }
    };

    const confirmDeleteVaccine = async (v: any) => {
        if (!v || !treatment) return;
        const itemId = v.id;
        setDeleteLoadingId({ type: 'vaccine', id: itemId });

        // OPTIMISTIC UPDATE: Remover inmediatamente de la UI
        setVaccines(prev => prev.filter(v => v.id !== itemId));

        try {
            await (treatmentVaccinesService as any).deleteTreatmentVaccine(String(itemId));
            // INVALIDAR CACHÉ ANTES DE REFRESCAR
            await Promise.all([
                treatmentVaccinesService.clearCache(),
                treatmentMedicationService.clearCache()
            ]);
            await refreshAssociations(treatment.id, true);
            showToast('Vacuna desvinculada', 'success');
        } catch (e: any) {
            // Manejo de consistencia: Si da 404, es que ya no existe.
            if (e?.response?.status === 404 || e?.status === 404) {
                console.warn('Item fantasma detectado (404), limpiando caché...');
                await Promise.all([
                    treatmentVaccinesService.clearCache(),
                    treatmentMedicationService.clearCache()
                ]);
                await refreshAssociations(treatment.id, true);
            } else {
                // ROLLBACK: Restaurar item si falla
                await refreshAssociations(treatment.id, true);
                showToast('Error al desvincular vacuna', 'error');
            }
        } finally {
            setDeleteLoadingId(null);
            setPendingDeleteVaccine(null);
        }
    };

    const openDeleteMedication = async (m: any) => {
        const itemId = m.id;
        if (confirmingDeleteId === itemId) {
            setConfirmingDeleteId(null);
            await confirmDeleteMedication(m);
        } else {
            setConfirmingDeleteId(itemId);
            showToast('Haz clic de nuevo para desvincular', 'warning');
            setTimeout(() => setConfirmingDeleteId(prev => prev === itemId ? null : prev), 3000);
        }
    };

    const confirmDeleteMedication = async (m: any) => {
        if (!m || !treatment) return;
        const itemId = m.id;
        setDeleteLoadingId({ type: 'medication', id: itemId });

        // OPTIMISTIC UPDATE: Remover inmediatamente de la UI
        setMedications(prev => prev.filter(m => m.id !== itemId));

        try {
            await (treatmentMedicationService as any).deleteTreatmentMedication(String(itemId));
            // INVALIDAR CACHÉ ANTES DE REFRESCAR
            await Promise.all([
                treatmentVaccinesService.clearCache(),
                treatmentMedicationService.clearCache()
            ]);
            await refreshAssociations(treatment.id, true);
            showToast('Medicamento desvinculado', 'success');
        } catch (e: any) {
            // Manejo de consistencia: Si da 404, es que ya no existe.
            if (e?.response?.status === 404 || e?.status === 404) {
                console.warn('Item fantasma detectado (404), limpiando caché...');
                await Promise.all([
                    treatmentVaccinesService.clearCache(),
                    treatmentMedicationService.clearCache()
                ]);
                await refreshAssociations(treatment.id, true);
            } else {
                // ROLLBACK: Restaurar item si falla
                await refreshAssociations(treatment.id, true);
                showToast('Error al desvincular medicamento', 'error');
            }
        } finally {
            setDeleteLoadingId(null);
            setPendingDeleteMedication(null);
        }
    };

    // --- Filtering & Sorting Lists ---
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
            return 0;
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
            return 0;
        });
        return arr;
    }, [medications, medListSearch, medSort, medicationLabelById]);

    // Bulk Handlers (Simplified for brevity, assuming existing logic)
    const submitBulkVaccEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!treatment || !bulkVaccForm || selectedVaccIds.length === 0) return;
        const payload: any = {};
        if (typeof bulkVaccForm.dose !== 'undefined' && String(bulkVaccForm.dose).trim()) payload.dose = bulkVaccForm.dose;
        if (typeof bulkVaccForm.notes !== 'undefined' && String(bulkVaccForm.notes).trim()) payload.notes = bulkVaccForm.notes;

        setSavingBulkVacc(true);
        try {
            await Promise.all(selectedVaccIds.map((id) => (treatmentVaccinesService as any).patchTreatmentVaccine(String(id), payload)));
            await refreshAssociations(treatment.id, true);
            setBulkVaccForm(null);
            setSelectedVaccIds([]);
            showToast(`Vacunas actualizadas`, 'success');
        } catch (err) {
            showToast('Error al actualizar vacunas', 'error');
        } finally {
            setSavingBulkVacc(false);
        }
    };

    const submitBulkMedEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!treatment || !bulkMedForm || selectedMedIds.length === 0) return;
        const payload: any = {};
        if (bulkMedForm.dosage) payload.dosage = bulkMedForm.dosage;
        if (bulkMedForm.frequency) payload.frequency = bulkMedForm.frequency;

        setSavingBulkMed(true);
        try {
            await Promise.all(selectedMedIds.map((id) => (treatmentMedicationService as any).patchTreatmentMedication(String(id), payload)));
            await refreshAssociations(treatment.id, true);
            setBulkMedForm(null);
            setSelectedMedIds([]);
            showToast(`Medicamentos actualizados`, 'success');
        } catch (err) {
            showToast('Error al actualizar medicamentos', 'error');
        } finally {
            setSavingBulkMed(false);
        }
    };

    // Fetch Full Detail - Use cached data first, then fetch if needed
    const handleViewItem = (type: 'vaccine' | 'medication', id: number) => {
        if (!id) {
            console.warn('handleViewItem: No ID provided');
            return;
        }

        console.log('handleViewItem called:', type, id);

        let itemData: any = null;

        if (type === 'vaccine') {
            // Use cached data from vaccineFullMap
            itemData = vaccineFullMap[id];
            console.log('Vaccine data from cache:', itemData);
        } else {
            // Use cached data from medicationFullMap
            itemData = medicationFullMap[id];
            console.log('Medication data from cache:', itemData);
        }

        if (itemData) {
            setViewDetailType(type);
            setViewDetailItem(itemData);
        } else {
            // Fallback: create a minimal object with the ID so user sees something
            setViewDetailType(type);
            setViewDetailItem({
                id,
                name: type === 'vaccine' ? `Vacuna #${id}` : `Medicamento #${id}`,
                _notFound: true
            });
            showToast('Los datos completos no están disponibles. Mostrando información básica.', 'warning');
        }
    };

    // Pagination Logic
    const paginatedVaccines = useMemo(() => {
        const start = (vaccPage - 1) * vaccPageSize;
        return sortedVaccines.slice(start, start + vaccPageSize);
    }, [sortedVaccines, vaccPage, vaccPageSize]);

    const paginatedMedications = useMemo(() => {
        const start = (medPage - 1) * medPageSize;
        return sortedMedications.slice(start, start + medPageSize);
    }, [sortedMedications, medPage, medPageSize]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <>
            <GenericModal
                isOpen={isOpen}
                onOpenChange={(open) => !open && onClose()}
                title={
                    <div className="flex items-center justify-between w-full pr-8">
                        <div className="flex items-center gap-2">
                            <span>Detalle del Tratamiento {treatment?.id ? `#${treatment.id}` : ''}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 hover:bg-primary/20 hover:text-primary transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (treatment?.id) refreshAssociations(treatment.id, true);
                                }}
                                title="Refrescar datos (bypass cache)"
                            >
                                <RefreshCw className={cn("h-4 w-4", loadingAssoc && "animate-spin")} />
                            </Button>
                        </div>
                    </div>
                }
                size="4xl"
                enableBackdropBlur
                description="Información detallada e insumos asociados"
                className={`bg-card text-card-foreground border border-border/80 shadow-2xl ${className}`}
                zIndex={zIndex || 1000}
            >
                <div className="space-y-6">
                    {/* Treatment Details Section */}
                    {treatment && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailSection
                                title="Plan de Tratamiento"
                                accent="purple"
                                icon={<FileText className="w-4 h-4" />}
                                fullWidth
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                                    <div className="space-y-3">
                                        <InfoField label="Descripción/Diagnóstico" value={treatment.description || treatment.diagnosis || '-'} fullWidth />
                                        <InfoField label="Fecha Inicio" value={formatDate(treatment.treatment_date)} />
                                    </div>
                                    <div className="space-y-3">
                                        <InfoField label="Dosis Global" value={treatment.dosis || '-'} />
                                        <InfoField label="Frecuencia" value={treatment.frequency || '-'} />
                                    </div>
                                </div>
                                {treatment.observations && <InfoField label="Observaciones" value={treatment.observations} fullWidth />}
                            </DetailSection>
                        </div>
                    )}

                    <div className="border-t border-border/40 my-4" />

                    {/* Actions Header for Supplies */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="text-sm font-medium text-foreground flex items-center gap-2">
                            <Pill className="h-4 w-4 text-primary" />
                            <span>Insumos del Tratamiento</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800"
                                onClick={() => { setShowAddVaccine((s) => !s); setShowAddMedication(false); }}
                                disabled={!treatment}
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Añadir vacuna
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
                                onClick={() => { setShowAddMedication((s) => !s); setShowAddVaccine(false); }}
                                disabled={!treatment}
                            >
                                <Plus className="h-4 w-4 mr-1.5" />
                                Añadir medicamento
                            </Button>
                        </div>
                    </div>

                    {/* Forms */}
                    {showAddVaccine && treatment && (
                        <form onSubmit={handleCreateVaccine} className="rounded-lg border bg-background/80 p-3 space-y-3 shadow-md animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Vacuna</label>
                                    <input
                                        type="text"
                                        className="mb-2 w-full h-8 rounded-md border bg-background px-2 text-sm"
                                        placeholder="Buscar vacuna…"
                                        value={vaccineSearch}
                                        onChange={(e) => setVaccineSearch(e.target.value)}
                                    />
                                    <select
                                        aria-label="Seleccionar vacunas"
                                        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                        multiple
                                        value={newVaccines.map(String)}
                                        onChange={(e) => setNewVaccines(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
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
                                    <Button type="submit" size="sm" disabled={savingVaccine}>Guardar</Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddVaccine(false)}>Cancelar</Button>
                                </div>
                            </div>
                            {newVaccineError && <div className="text-xs text-destructive">{newVaccineError}</div>}
                        </form>
                    )}

                    {showAddMedication && treatment && (
                        <form onSubmit={handleCreateMedication} className="rounded-lg border bg-background/80 p-3 space-y-3 shadow-md animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Medicamento</label>
                                    <input
                                        type="text"
                                        className="mb-2 w-full h-8 rounded-md border bg-background px-2 text-sm"
                                        placeholder="Buscar medicamento…"
                                        value={medicationSearch}
                                        onChange={(e) => setMedicationSearch(e.target.value)}
                                    />
                                    <select
                                        aria-label="Seleccionar medicamentos"
                                        className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                                        multiple
                                        value={newMedications.map(String)}
                                        onChange={(e) => setNewMedications(Array.from(e.target.selectedOptions).map((o) => Number(o.value)))}
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
                                    <Button type="submit" size="sm" disabled={savingMedication}>Guardar</Button>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddMedication(false)}>Cancelar</Button>
                                </div>
                            </div>
                            {newMedicationError && <div className="text-xs text-destructive">{newMedicationError}</div>}
                        </form>
                    )}

                    {/* Supplies Lists */}
                    <TreatmentSuppliesCards
                        items={paginatedVaccines}
                        title="Vacunas"
                        icon={<Syringe className="h-4 w-4" />}
                        accent="cyan"
                        loading={loadingAssoc}
                        emptyMessage="No hay vacunas asociadas"
                        onDelete={openDeleteVaccine}
                        confirmDeleteId={confirmingDeleteId}
                        deleteLoadingId={deleteLoadingId?.type === 'vaccine' ? deleteLoadingId.id : null}
                        onView={(item) => handleViewItem('vaccine', Number(item.vaccine_id))}
                        currentPage={vaccPage}
                        onPageChange={setVaccPage}
                        totalItems={sortedVaccines.length}
                        pageSize={vaccPageSize}
                        onSelect={(id, checked) => {
                            setSelectedVaccIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
                        }}
                        selectedIds={selectedVaccIds}
                        showSelection={vaccShowOnlySelected}
                        bulkActions={
                            selectedVaccIds.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setBulkVaccForm({})} >
                                        <Edit2 className="h-3 w-3 mr-1" /> Editar ({selectedVaccIds.length})
                                    </Button>
                                </div>
                            )
                        }
                    />

                    <TreatmentSuppliesCards
                        items={paginatedMedications}
                        title="Medicamentos"
                        icon={<Pill className="h-4 w-4" />}
                        accent="purple"
                        loading={loadingAssoc}
                        emptyMessage="No hay medicamentos asociados"
                        onDelete={openDeleteMedication}
                        confirmDeleteId={confirmingDeleteId}
                        deleteLoadingId={deleteLoadingId?.type === 'medication' ? deleteLoadingId.id : null}
                        onView={(item) => handleViewItem('medication', Number(item.medication_id))}
                        currentPage={medPage}
                        onPageChange={setMedPage}
                        totalItems={sortedMedications.length}
                        pageSize={medPageSize}
                        onSelect={(id, checked) => {
                            setSelectedMedIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
                        }}
                        selectedIds={selectedMedIds}
                        showSelection={medShowOnlySelected}
                        bulkActions={
                            selectedMedIds.length > 0 && (
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setBulkMedForm({})} >
                                        <Edit2 className="h-3 w-3 mr-1" /> Editar ({selectedMedIds.length})
                                    </Button>
                                </div>
                            )
                        }
                    />
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 mt-4 border-t border-border/40">
                    <Button variant="outline" onClick={onClose} className="rounded-xl px-6">
                        Cerrar
                    </Button>
                </div>
            </GenericModal>

            {/* View Detail Modal for Vaccine/Medication */}
            {viewDetailItem && (
                <ItemDetailModal
                    type={viewDetailType || 'vaccine'}
                    item={viewDetailItem}
                    options={{
                        vaccines: vaccineOptions.reduce((acc, curr) => ({ ...acc, [curr.value]: curr.label }), {}),
                        medications: medicationOptions.reduce((acc, curr) => ({ ...acc, [curr.value]: curr.label }), {}),
                        routes: vaccineRouteMap
                    }}
                    onClose={() => setViewDetailItem(null)}
                    zIndex={(zIndex || 1000) + 10}
                />
            )}
        </>
    );
};

// Helper Components
function DetailSection({
    title,
    children,
    accent = 'blue',
    fullWidth = false,
    icon
}: {
    title: string;
    children: React.ReactNode;
    accent?: string;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}) {
    const accentClasses: Record<string, string> = {
        blue: "text-blue-700 dark:text-blue-300 before:bg-blue-500 shadow-blue-500/10",
        cyan: "text-cyan-700 dark:text-cyan-300 before:bg-cyan-500 shadow-cyan-500/10",
        teal: "text-teal-700 dark:text-teal-300 before:bg-teal-500 shadow-teal-500/10",
        emerald: "text-emerald-700 dark:text-emerald-300 before:bg-emerald-500 shadow-emerald-500/10",
        purple: "text-purple-700 dark:text-purple-300 before:bg-purple-500 shadow-purple-500/10",
        indigo: "text-indigo-700 dark:text-indigo-300 before:bg-indigo-500 shadow-indigo-500/10",
        red: "text-red-700 dark:text-red-300 before:bg-red-500 shadow-red-500/10",
        amber: "text-amber-700 dark:text-amber-300 before:bg-amber-500 shadow-amber-500/10",
        slate: "text-slate-700 dark:text-slate-300 before:bg-slate-500 shadow-slate-500/10",
    };

    const classes = accentClasses[accent] || accentClasses.slate;
    const [textClasses, barClasses] = [
        classes.split(' before:')[0],
        classes.split(' before:')[1]
    ];

    return (
        <div className={cn(
            "rounded-xl p-4 shadow-sm border transition-all hover:shadow-md h-full flex flex-col bg-card border-border/60",
            fullWidth && "col-span-full"
        )}>
            <h4 className={cn(
                "text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-2",
                textClasses
            )}>
                {icon}
                <span className={cn("flex items-center gap-2 before:content-[''] before:w-1 before:h-3 before:rounded-full", barClasses)}>
                    {title}
                </span>
            </h4>
            <div className="space-y-3 flex-grow">
                {children}
            </div>
        </div>
    );
}

function InfoField({
    label,
    value,
    fullWidth = false,
    badge = false,
    badgeVariant = 'default'
}: {
    label: string;
    value: any;
    fullWidth?: boolean;
    badge?: boolean;
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
}) {
    const displayValue = value !== null && value !== undefined ? String(value) : '-';

    return (
        <div className={cn("space-y-1", fullWidth && "col-span-full")}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {label}
            </div>
            {badge ? (
                <Badge
                    variant={badgeVariant as any}
                    className={cn(
                        "text-[10px] px-2 py-0 h-5",
                        badgeVariant === 'success' && "bg-green-600 text-white"
                    )}
                >
                    {displayValue}
                </Badge>
            ) : (
                <div className={cn(
                    "text-xs sm:text-sm font-medium text-foreground/90",
                    fullWidth && "whitespace-pre-wrap leading-relaxed"
                )}>
                    {displayValue}
                </div>
            )}
        </div>
    );
}
