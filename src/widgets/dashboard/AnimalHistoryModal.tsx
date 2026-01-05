import React from "react";
import { useState, useMemo, useEffect } from "react";
import { useAnimalDiseases } from "@/entities/animal-disease/model/useAnimalDiseases";
import { useAnimalFields } from "@/entities/animal-field/model/useAnimalFields";
import { useTreatment } from "@/entities/treatment/model/useTreatment";
import { useControls } from "@/entities/control/model/useControl";
import { safeArray } from '@/shared/utils/apiHelpers';
import { getAnimalLabel } from '@/entities/animal/lib/animalHelpers';
import { Clock, Activity, MapPin, Stethoscope, Syringe } from "lucide-react";
import { Modal, ModalContent, ModalHeader, ModalBody } from "@/shared/ui/common/UnifiedModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { format, differenceInCalendarDays } from "date-fns";

// Interfaces for data types - removed unused interfaces

// Timeline event interface
interface TimelineEvent {
   id: string;
   date: string;
   type: 'disease' | 'treatment' | 'control' | 'movement';
   title: string;
   description: string;
   status?: string;
   icon: React.ReactNode;
   previewType?: 'treatment' | 'field' | 'disease' | 'control';
   previewData?: any;
  // Vencimientos (solo aplica a vacunación)
  isVaccination?: boolean;
  dueDate?: string;
  dueStatus?: 'due_soon' | 'overdue' | 'ok';
  dueInDays?: number;
  dueLabel?: string;
}

interface AnimalHistoryModalProps {
   animal: {
     idAnimal: number;
     record: string;
     name?: string;
     breed?: {
       name: string;
       species?: {
         name: string;
       };
     };
     birth_date?: string;
     sex?: string;
     status?: string;
   };
   onClose: () => void;
   refreshTrigger?: number;
 }

export const AnimalHistoryModal = ({ animal, onClose, refreshTrigger }: AnimalHistoryModalProps) => {
    console.log('AnimalHistoryModal rendered with animal:', animal);
    const { data: animalDiseases, refetch: refetchDiseases } = useAnimalDiseases();
    const { data: animalFields, refetch: refetchFields } = useAnimalFields();
    const { data: treatments, refetch: refetchTreatments } = useTreatment();
    const { data: controls, refetch: refetchControls } = useControls();
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [remoteHistory, setRemoteHistory] = useState<any | null>(null);

    // Refrescar todos los datos al montar el componente (cuando se abre el historial)
    useEffect(() => {
      const refreshAllData = async () => {
        try {
          await Promise.all([
            refetchDiseases?.(),
            refetchFields?.(),
            refetchTreatments?.(),
            refetchControls?.()
          ]);
        } catch (e) {
          console.error('Error refreshing history data:', e);
        }
      };
      refreshAllData();
    }, [refetchDiseases, refetchFields, refetchTreatments, refetchControls]); // Solo al montar

    // Estado para vista previa
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewType, setPreviewType] = useState<'treatment' | 'field' | 'disease' | 'control' | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);

   // Cargar historial médico consolidado desde analytics si está disponible
   useEffect(() => {
     let active = true;
     const load = async () => {
       setHistoryLoading(true);
       setHistoryError(null);
       try {
         const { analyticsService } = await import('@/features/reporting/api/analytics.service');
         const data = await analyticsService.getAnimalMedicalHistory(animal.idAnimal).catch(() => null);
         if (active) setRemoteHistory(data);
       } catch (e: any) {
         if (active) setHistoryError(e?.message || 'Could not load remote history');
       } finally {
         if (active) setHistoryLoading(false);
       }
     };
     load();
     return () => {
       active = false;
     };
   }, [animal.idAnimal, refreshTrigger]);

   // Refrescar datos cuando cambia refreshTrigger
   useEffect(() => {
     if (refreshTrigger !== undefined && refreshTrigger > 0) {
       refetchDiseases?.();
       refetchFields?.();
       refetchTreatments?.();
       refetchControls?.();
     }
   }, [refreshTrigger, refetchDiseases, refetchFields, refetchTreatments, refetchControls]);

   // Filter and search states - removed unused filter states
   // const [searchTerm, setSearchTerm] = useState('');
   // const [selectedEventType, setSelectedEventType] = useState<string>("all");
   // const [selectedDateRange, setSelectedDateRange] = useState<string>("all");
   // const [activeTab, setActiveTab] = useState("timeline");

   // Filter data for the selected animal
   const safeAnimalDiseases = safeArray(animalDiseases);
   const safeAnimalFields = safeArray(animalFields);
   const safeTreatments = safeArray(treatments);
   const safeControls = safeArray(controls);

   // Helper to determine if a record belongs to the current animal, supporting multiple possible shapes
   const belongsToAnimal = (item: any) => {
     const ids = [
       item?.animal_id,
       item?.animals?.id,
       item?.animal?.id,
       item?.animal?.idAnimal,
       item?.animals?.idAnimal,
     ].filter((v) => v !== undefined && v !== null);
     return ids.some((id) => Number(id) === Number(animal.idAnimal));
   };

   const animalDiseasesData = safeAnimalDiseases.filter((disease: any) => belongsToAnimal(disease));
   const animalFieldsData = safeAnimalFields.filter((field: any) => belongsToAnimal(field));
   const animalTreatmentsData = safeTreatments.filter((treatment: any) => belongsToAnimal(treatment));
   const animalControlsData = safeControls.filter((control: any) => belongsToAnimal(control));

   // Create timeline events from all data sources
   const timelineEvents = useMemo(() => {
     const events: TimelineEvent[] = [];

     // Add disease events
     animalDiseasesData.forEach((disease: any) => {
       events.push({
         id: `disease-${disease.id}`,
         date: disease.treatment_date,
         type: 'disease',
         title: `Enfermedad: ${disease.disease?.name}`,
         description: `Tratamiento: ${disease.treatment || 'No especificado'}`,
         status: disease.status,
         icon: <Stethoscope className="w-4 h-4" />,
         previewType: 'disease',
         previewData: {
           disease: disease.disease?.name || 'Enfermedad',
           start: disease.treatment_date,
           treatment: disease.treatment || '',
           status: disease.status || '',
           severity: disease.severity || '',
           notes: disease.notes || ''
         }
       });
     });

     // Add treatment events
     animalTreatmentsData.forEach((treatment: any) => {
       events.push({
         id: `treatment-${treatment.id}`,
         date: treatment.treatment_date,
         type: 'treatment',
         title: `Tratamiento: ${treatment.description}`,
         description: `Dosis: ${treatment.dosis} - Frecuencia: ${treatment.frequency}`,
         status: 'active',
         icon: <Syringe className="w-4 h-4" />,
         previewType: 'treatment',
         previewData: {
           date: treatment.treatment_date,
           type: 'Tratamiento',
           description: treatment.description || 'Tratamiento',
           dose: treatment.dosis || (treatment as any).dose || '',
           frequency: treatment.frequency || '',
           status: treatment.status || '',
           veterinarian: treatment.veterinarian || '',
           cost: treatment.cost ?? '',
           notes: treatment.notes || '',
           plan: treatment.treatment_plan || '',
           follow_up_date: treatment.follow_up_date,
           treatment_type: treatment.treatment_type || ''
         }
       });
     });

     // Add control events
     animalControlsData.forEach((control: any) => {
       const healthStatus = control.health_status || control.healt_status || '';
       events.push({
         id: `control-${control.id}`,
         date: control.checkup_date,
         type: 'control',
         title: 'Control de Salud',
         description: `Estado: ${healthStatus} - ${control.description}`,
         status: healthStatus,
         icon: <Activity className="w-4 h-4" />,
         previewType: 'control',
         previewData: {
           date: control.checkup_date,
           status: healthStatus,
           weight: control.weight ?? '',
           temperature: control.temperature ?? '',
           heart_rate: control.heart_rate ?? '',
           respiratory_rate: control.respiratory_rate ?? '',
           height: control.height ?? '',
           body_condition: control.body_condition ?? '',
           veterinarian: control.veterinarian || '',
           next_control_date: control.next_control_date || '',
           notes: control.description || control.observations || ''
         }
       });
     });

     // Add movement events
     animalFieldsData.forEach(field => {
       events.push({
         id: `movement-${field.id}`,
         date: field.assignment_date,
         type: 'movement',
         title: `Asignación a ${field.field?.name}`,
         description: `Motivo: ${field.reason || field.notes || 'No especificado'}`,
         status: field.removal_date ? 'completed' : 'active',
         icon: <MapPin className="w-4 h-4" />,
         previewType: 'field',
         previewData: (() => {
           const assignment = field.assignment_date;
           const removal = field.removal_date;
           const endRef = removal ? new Date(removal) : new Date();
           const startRef = assignment ? new Date(assignment) : null;
           const duration_days = startRef ? Math.max(0, Math.ceil((endRef.getTime() - startRef.getTime()) / (1000 * 60 * 60 * 24))) : '';
           return {
             field: field.field?.name || 'Campo',
             assignment,
             removal,
             notes: field.reason || field.notes || '—',
             is_active: !!field.is_active && !removal,
             status: removal ? 'Retirado' : 'Asignado',
             duration_days
           };
         })()
       });
     });

     // Merge remote history if structure provides arrays (heurística flexible)
     if (remoteHistory) {
       // Treatments
       const rhTreatments = (remoteHistory.treatments || remoteHistory.medical_treatments || []);
       rhTreatments.forEach((t: any) => {
         if (!t?.id || !t?.treatment_date) return;
         events.push({
           id: `rh-treatment-${t.id}`,
           date: t.treatment_date,
           type: 'treatment',
           title: `Tratamiento: ${t.diagnosis || t.description || 'Sin descripción'}`,
           description: t.notes || t.treatment_plan || '—',
           status: t.status,
           icon: <Syringe className="w-4 h-4" />,
           previewType: 'treatment',
           previewData: {
             date: t.treatment_date,
             type: 'Tratamiento',
             description: t.diagnosis || t.description || 'Tratamiento',
             dose: t.dose || t.dosage || '',
             frequency: t.frequency || t.interval || '',
             status: t.status || '',
             veterinarian: t.veterinarian || '',
             cost: t.cost ?? '',
             notes: t.notes || '',
             plan: t.treatment_plan || '',
             follow_up_date: t.follow_up_date,
             treatment_type: t.treatment_type || ''
           }
         });
       });
       // Vaccinations
       const rhVaccinations = (remoteHistory.vaccinations || []);
       rhVaccinations.forEach((v: any) => {
         if (!v?.id || !v?.vaccination_date) return;
         const dueRaw = v.next_due_date || v.next_vaccination_date || v.expiry_date || null;
         const dueInfo = getDueInfo(dueRaw);
         events.push({
           id: `rh-vaccination-${v.id}`,
           date: v.vaccination_date,
           type: 'treatment',
           title: `Vacunación: ${v.vaccine?.name || v.vaccine_name || 'Vacuna'}`,
           description: `Dosis: ${v.dose || v.dosage || '-'}${v.status ? ' - ' + v.status : ''}`,
           status: v.status,
           icon: <Syringe className="w-4 h-4" />,
           isVaccination: true,
           dueDate: dueRaw || undefined,
           dueStatus: dueInfo?.status,
           dueInDays: dueInfo?.days,
           dueLabel: dueInfo && (dueInfo.status === 'due_soon' || dueInfo.status === 'overdue') ? dueInfo.label : undefined,
           previewType: 'treatment',
           previewData: {
             date: v.vaccination_date,
             type: 'Vacunación',
             description: v.vaccine?.name || v.vaccine_name || 'Vacunación',
             dose: v.dose || v.dosage || '',
             frequency: v.frequency || '',
             status: v.status || '',
             veterinarian: v.veterinarian || '',
             cost: '',
             notes: v.notes || '',
             plan: '',
             follow_up_date: v.next_vaccination_date || v.next_due_date,
             vaccine_name: v.vaccine?.name || v.vaccine_name,
             batch_number: v.batch_number || '',
             expiry_date: v.expiry_date || '',
             administration_route: v.administration_route || '',
             adverse_reactions: v.adverse_reactions || '',
             next_vaccination_date: v.next_vaccination_date || '',
             next_due_date: v.next_due_date || '',
             dose_volume: v.dose_volume || '',
             administered_by: v.administered_by || ''
           }
         });
       });
       // Controls
       const rhControls = (remoteHistory.controls || remoteHistory.health_checks || []);
       rhControls.forEach((c: any) => {
         if (!c?.id || !c?.control_date) return;
         events.push({
           id: `rh-control-${c.id}`,
           date: c.control_date,
           type: 'control',
           title: 'Health Check',
           description: `Weight: ${c.weight ?? '-'} Temp: ${c.temperature ?? '-'}`,
           status: c.health_status || c.status,
           icon: <Activity className="w-4 h-4" />,
           previewType: 'control',
           previewData: {
             date: c.control_date,
             status: c.health_status || c.status || '',
             weight: c.weight ?? '',
             temperature: c.temperature ?? '',
             heart_rate: c.heart_rate ?? '',
             respiratory_rate: c.respiratory_rate ?? '',
             height: c.height ?? '',
             body_condition: c.body_condition ?? '',
             veterinarian: c.veterinarian || '',
             next_control_date: c.next_control_date || '',
             notes: c.notes || c.description || ''
           }
         });
       });
       // Diseases / Diagnoses
       const rhDiseases = (remoteHistory.diseases || remoteHistory.diagnoses || []);
       rhDiseases.forEach((d: any) => {
         const date = d.diagnosis_date || d.treatment_date;
         if (!d?.id || !date) return;
         events.push({
           id: `rh-disease-${d.id}`,
           date,
           type: 'disease',
           title: `Disease: ${d.disease?.name || d.disease_name || d.name || 'Pathology'}`,
           description: d.notes || d.symptoms || '—',
           status: d.status,
           icon: <Stethoscope className="w-4 h-4" />,
           previewType: 'disease',
           previewData: {
             disease: d.disease?.name || d.disease_name || d.name || 'Enfermedad',
             start: d.diagnosis_date || d.treatment_date,
             treatment: d.treatment || d.treatment_plan || '',
             status: d.status || '',
             severity: d.severity || '',
             notes: d.notes || d.symptoms || ''
           }
         });
       });
     }

     // Sort events by date (most recent first)
     return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
   }, [animalDiseasesData, animalTreatmentsData, animalControlsData, animalFieldsData, remoteHistory]);

   const formatDate = (dateString: string) => {
     try {
       return format(new Date(dateString), "PPP");
     } catch (error) {
       return dateString;
     }
   };

   // --- Badges y estilos helpers ---
   const TypeBadge = ({ type }: { type: string }) => {
     const isVac = (type || '').toLowerCase().includes('vacun');
     const classes = isVac
       ? 'bg-blue-100 text-blue-700'
       : 'bg-emerald-100 text-emerald-700';
     const Icon = isVac ? Syringe : Stethoscope;
     const label = type || (isVac ? 'Vacunación' : 'Tratamiento');
     return (
       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${classes}`}>
         <Icon className="w-3.5 h-3.5" />
         {label}
       </span>
     );
   };

   const getEventTypeClasses = (type: 'disease' | 'treatment' | 'control' | 'movement') => {
     switch (type) {
       case 'disease':
         return 'bg-rose-100 text-rose-700';
       case 'control':
         return 'bg-emerald-100 text-emerald-700';
       case 'movement':
         return 'bg-amber-100 text-amber-700';
       case 'treatment':
       default:
         return 'bg-blue-100 text-blue-700';
     }
   };

   const getStatusBadgeClasses = (status?: string) => {
     if (!status) return 'bg-gray-100 text-gray-700';
     const s = String(status).toLowerCase();
     if (['activo', 'active', 'pendiente', 'in-progress'].some(k => s.includes(k))) {
       return 'bg-amber-100 text-amber-700';
     }
     if (['complet', 'resuelto', 'recovered', 'ok', 'normal'].some(k => s.includes(k))) {
       return 'bg-emerald-100 text-emerald-700';
     }
     if (['grave', 'crit', 'bad', 'malo'].some(k => s.includes(k))) {
       return 'bg-rose-100 text-rose-700';
     }
     return 'bg-gray-100 text-gray-700';
   };

  // Helpers para vencimientos de vacunación
  const getDueInfo = (dueRaw?: string | null) => {
    if (!dueRaw) return null;
    try {
      const today = new Date();
      const d = new Date(dueRaw);
      const days = differenceInCalendarDays(d, today);
      if (Number.isNaN(days)) return null;
      if (days < 0) return { status: 'overdue' as const, days: Math.abs(days), label: `Vencido hace ${Math.abs(days)} días` };
      if (days === 0) return { status: 'due_soon' as const, days, label: 'Vence hoy' };
      if (days <= 14) return { status: 'due_soon' as const, days, label: `Vence en ${days} días` };
      return { status: 'ok' as const, days, label: `Vence en ${days} días` };
    } catch {
      return null;
    }
  };

  const getDueBadgeClasses = (dueStatus: 'due_soon' | 'overdue') => {
    return dueStatus === 'overdue' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
  };

  const getDueRingClasses = (dueStatus?: 'due_soon' | 'overdue' | 'ok') => {
    if (dueStatus === 'overdue') return 'ring-2 ring-rose-400';
    if (dueStatus === 'due_soon') return 'ring-2 ring-amber-400';
    return '';
  };

   // Filas para tablas: combinamos datos locales y, si existen, del historial remoto
   const treatmentRows = useMemo(() => {
     const local = animalTreatmentsData.map((t: any) => ({
       date: t.treatment_date,
       type: 'Tratamiento',
       description: t.description || 'Tratamiento',
       dose: t.dosis || t.dose || '',
       frequency: t.frequency || '',
       status: t.status || '',
       veterinarian: t.veterinarian || '',
       cost: t.cost ?? '',
       notes: t.notes || '',
       plan: t.treatment_plan || '',
       follow_up_date: t.follow_up_date,
       treatment_type: t.treatment_type || ''
     }));
     const rhT = (remoteHistory?.treatments || remoteHistory?.medical_treatments || []).map((t: any) => ({
       date: t.treatment_date,
       type: 'Tratamiento',
       description: t.diagnosis || t.description || 'Tratamiento',
       dose: t.dose || t.dosage || '',
       frequency: t.frequency || t.interval || '',
       status: t.status || '',
       veterinarian: t.veterinarian || '',
       cost: t.cost ?? '',
       notes: t.notes || '',
       plan: t.treatment_plan || '',
       follow_up_date: t.follow_up_date,
       treatment_type: t.treatment_type || ''
     }));
     const rhV = (remoteHistory?.vaccinations || []).map((v: any) => ({
       date: v.vaccination_date,
       type: 'Vacunación',
       description: v.vaccine?.name || v.vaccine_name || 'Vacunación',
       dose: v.dose || v.dosage || '',
       frequency: v.frequency || '',
       status: v.status || '',
       veterinarian: v.veterinarian || '',
       cost: '',
       notes: v.notes || '',
       plan: '',
       follow_up_date: v.next_vaccination_date || v.next_due_date,
       vaccine_name: v.vaccine?.name || v.vaccine_name,
       batch_number: v.batch_number || '',
       expiry_date: v.expiry_date || '',
       administration_route: v.administration_route || '',
       adverse_reactions: v.adverse_reactions || '',
       next_vaccination_date: v.next_vaccination_date || '',
       next_due_date: v.next_due_date || '',
       dose_volume: v.dose_volume || '',
       administered_by: v.administered_by || ''
     }));
     const rows = [...local, ...rhT, ...rhV].filter(r => r.date);
     rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
     return rows;
   }, [animalTreatmentsData, remoteHistory]);

   const fieldRows = useMemo(() => {
     const rows = animalFieldsData.map((f: any) => {
       const assignment = f.assignment_date;
       const removal = f.removal_date;
       const endRef = removal ? new Date(removal) : new Date();
       const startRef = assignment ? new Date(assignment) : null;
       const duration_days = startRef ? Math.max(0, Math.ceil((endRef.getTime() - startRef.getTime()) / (1000 * 60 * 60 * 24))) : '';
       return ({
         field: f.field?.name || 'Campo',
         assignment,
         removal,
         notes: f.reason || f.notes || '—',
         is_active: !!f.is_active && !removal,
         status: removal ? 'Retirado' : 'Asignado',
         duration_days
       });
     });
     rows.sort((a, b) => new Date((b.assignment || b.removal || 0) as any).getTime() - new Date((a.assignment || a.removal || 0) as any).getTime());
     return rows;
   }, [animalFieldsData]);

   const diseaseRows = useMemo(() => {
     const local = animalDiseasesData.map((d: any) => ({
       disease: d.disease?.name || 'Enfermedad',
       start: d.treatment_date,
       treatment: d.treatment || '',
       status: d.status || '',
       severity: d.severity || '',
       notes: d.notes || ''
     }));
     const remote = [
       ...(remoteHistory?.diseases || []),
       ...(remoteHistory?.diagnoses || [])
     ].map((d: any) => ({
       disease: d.disease?.name || d.disease_name || d.name || 'Enfermedad',
       start: d.diagnosis_date || d.treatment_date,
       treatment: d.treatment || d.treatment_plan || '',
       status: d.status || '',
       severity: d.severity || '',
       notes: d.notes || d.symptoms || ''
     }));
     const rows = [...local, ...remote].filter(r => r.start || r.disease);
     rows.sort((a, b) => new Date(b.start || 0).getTime() - new Date(a.start || 0).getTime());
     return rows;
   }, [animalDiseasesData, remoteHistory]);

   const controlRows = useMemo(() => {
     const local = animalControlsData.map((c: any) => ({
       date: c.checkup_date,
       status: c.healt_status || c.health_status || '',
       weight: c.weight ?? '',
       temperature: c.temperature ?? '',
       heart_rate: c.heart_rate ?? '',
       respiratory_rate: c.respiratory_rate ?? '',
       height: c.height ?? '',
       body_condition: c.body_condition ?? '',
       veterinarian: c.veterinarian || '',
       next_control_date: c.next_control_date || '',
       notes: c.description || c.observations || ''
     }));
     const remote = (remoteHistory?.controls || remoteHistory?.health_checks || []).map((c: any) => ({
       date: c.control_date,
       status: c.health_status || c.status || '',
       weight: c.weight ?? '',
       temperature: c.temperature ?? '',
       heart_rate: c.heart_rate ?? '',
       respiratory_rate: c.respiratory_rate ?? '',
       height: c.height ?? '',
       body_condition: c.body_condition ?? '',
       veterinarian: c.veterinarian || '',
       next_control_date: c.next_control_date || '',
       notes: c.notes || c.description || ''
     }));
     const rows = [...local, ...remote].filter(r => r.date);
     rows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
     return rows;
   }, [animalControlsData, remoteHistory]);

   // --- Vista previa ---
   const openPreview = (type: 'treatment' | 'field' | 'disease' | 'control', data: any) => {
     setPreviewType(type);
     setPreviewData(data);
     setPreviewOpen(true);
   };

   const closePreview = () => {
     setPreviewOpen(false);
     setPreviewData(null);
     setPreviewType(null);
   };

  // Componente InfoField reutilizable
  const InfoField = ({
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
    badgeVariant?: 'default' | 'secondary' | 'destructive' | 'success';
  }) => {
    const displayValue = value !== null && value !== undefined && value !== '' ? String(value) : '—';

    return (
      <div className={`space-y-1.5 ${fullWidth ? 'col-span-full' : ''}`}>
        <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {badge ? (
          <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
            badgeVariant === 'success' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-100' :
            badgeVariant === 'destructive' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-100' :
            badgeVariant === 'secondary' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100' :
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100'
          }`}>
            {displayValue}
          </span>
        ) : (
          <div className={`text-sm font-medium text-foreground ${fullWidth ? 'whitespace-pre-wrap' : ''}`}>
            {displayValue}
          </div>
        )}
      </div>
    );
  };

  const PreviewContent = () => {
     if (!previewType || !previewData) return null;
     const row = previewData as any;

     return (
       <div className="space-y-6">
         <div className="text-sm text-muted-foreground font-medium border-b pb-3">
           {getAnimalLabel(animal)}
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {previewType === 'treatment' && (
                 <>
                   <InfoField label="Fecha" value={row.date ? formatDate(row.date) : '—'} />
                   <InfoField label="Tipo" value={row.type} badge badgeVariant="default" />
                   <InfoField label="Estado" value={row.status} badge badgeVariant={
                     row.status?.toLowerCase().includes('complet') ? 'success' :
                     row.status?.toLowerCase().includes('activ') || row.status?.toLowerCase().includes('progress') ? 'default' :
                     'secondary'
                   } />
                   <InfoField label="Veterinario" value={row.veterinarian} />
                   <InfoField label="Descripción" value={row.description} fullWidth />
                   <InfoField label="Dosis" value={row.dose} />
                   <InfoField label="Frecuencia" value={row.frequency} />
                   {row.plan && <InfoField label="Plan de tratamiento" value={row.plan} fullWidth />}
                   {row.follow_up_date && <InfoField label="Próximo seguimiento" value={formatDate(row.follow_up_date)} />}
                   {row.treatment_type && <InfoField label="Tipo de tratamiento" value={row.treatment_type} />}
                   {row.cost !== '' && <InfoField label="Costo" value={row.cost} />}
                   {row.notes && <InfoField label="Notas" value={row.notes} fullWidth />}
                   {row.type === 'Vacunación' && (
                     <>
                       {row.vaccine_name && <InfoField label="Vacuna" value={row.vaccine_name} />}
                       {row.batch_number && <InfoField label="Lote" value={row.batch_number} />}
                       {row.expiry_date && <InfoField label="Vence" value={formatDate(row.expiry_date)} />}
                       {row.administration_route && <InfoField label="Vía administración" value={row.administration_route} />}
                       {row.adverse_reactions && <InfoField label="Reacciones adversas" value={row.adverse_reactions} fullWidth />}
                       {row.next_vaccination_date && <InfoField label="Siguiente vacunación" value={formatDate(row.next_vaccination_date)} />}
                       {row.next_due_date && <InfoField label="Próximo vencimiento" value={formatDate(row.next_due_date)} />}
                       {row.dose_volume !== '' && <InfoField label="Volumen dosis" value={row.dose_volume} />}
                       {row.administered_by && <InfoField label="Aplicado por" value={row.administered_by} />}
                     </>
                   )}
                 </>
               )}
               {previewType === 'field' && (
                 <>
                   <InfoField label="Campo" value={row.field} />
                   <InfoField label="Fecha de Asignación" value={row.assignment ? formatDate(row.assignment) : '—'} />
                   {row.removal && <InfoField label="Fecha de Retiro" value={formatDate(row.removal)} />}
                   <InfoField label="Estado" value={row.status || (row.removal ? 'Retirado' : 'Asignado')} badge badgeVariant={
                     row.removal ? 'secondary' : 'success'
                   } />
                   {row.duration_days !== '' && <InfoField label="Duración (días)" value={row.duration_days} />}
                   {row.notes && row.notes !== '—' && <InfoField label="Notas" value={row.notes} fullWidth />}
                 </>
               )}
               {previewType === 'disease' && (
                 <>
                   <InfoField label="Enfermedad" value={row.disease} fullWidth />
                   <InfoField label="Fecha de Inicio" value={row.start ? formatDate(row.start) : '—'} />
                   <InfoField label="Estado" value={row.status} badge badgeVariant={
                     row.status?.toLowerCase().includes('curado') || row.status?.toLowerCase().includes('recovered') ? 'success' :
                     row.status?.toLowerCase().includes('activ') ? 'destructive' :
                     'secondary'
                   } />
                   {row.severity && <InfoField label="Severidad" value={row.severity} badge badgeVariant={
                     row.severity?.toLowerCase().includes('grave') || row.severity?.toLowerCase().includes('sever') ? 'destructive' :
                     row.severity?.toLowerCase().includes('moderado') ? 'default' :
                     'secondary'
                   } />}
                   {row.treatment && <InfoField label="Tratamiento" value={row.treatment} fullWidth />}
                   {row.notes && <InfoField label="Notas" value={row.notes} fullWidth />}
                 </>
               )}
               {previewType === 'control' && (
                 <>
                   <InfoField label="Fecha" value={row.date ? formatDate(row.date) : '—'} />
                   <InfoField label="Estado de Salud" value={row.status} badge badgeVariant={
                     row.status?.toLowerCase().includes('excelente') || row.status?.toLowerCase().includes('bueno') ? 'success' :
                     row.status?.toLowerCase().includes('regular') ? 'default' :
                     row.status?.toLowerCase().includes('malo') || row.status?.toLowerCase().includes('grave') ? 'destructive' :
                     'secondary'
                   } />
                   {row.weight !== '' && <InfoField label="Peso (kg)" value={row.weight} />}
                   {row.temperature !== '' && <InfoField label="Temperatura (°C)" value={row.temperature} />}
                   {row.heart_rate !== '' && <InfoField label="Frecuencia Cardíaca (lpm)" value={row.heart_rate} />}
                   {row.respiratory_rate !== '' && <InfoField label="Frecuencia Respiratoria (rpm)" value={row.respiratory_rate} />}
                   {row.height !== '' && <InfoField label="Altura" value={row.height} />}
                   {row.body_condition !== '' && <InfoField label="Condición Corporal" value={row.body_condition} />}
                   {row.veterinarian && <InfoField label="Veterinario" value={row.veterinarian} />}
                   {row.next_control_date && <InfoField label="Próximo Control" value={formatDate(row.next_control_date)} />}
                   {row.notes && <InfoField label="Notas" value={row.notes} fullWidth />}
                 </>
               )}
         </div>
       </div>
     );
   };

     return (
       <>
         <Modal
           isOpen={true}
           onClose={onClose}
           size="6xl"
           description={`${getAnimalLabel(animal) || 'Sin registro'}`}
           allowFullScreenToggle={true}
         >
           <ModalHeader>
             <span className="flex items-center gap-2">
               <Clock className="w-5 h-5" />
               Historial - {getAnimalLabel(animal) || 'Sin registro'}
             </span>
           </ModalHeader>
           <ModalContent className="flex flex-col overflow-hidden">
             <ModalBody className="flex-1 overflow-hidden p-0">
               <div className="flex flex-col h-full">
                 {/* Manejo de loading y error */}
                 {historyLoading ? (
                   <div className="flex justify-center items-center py-8">
                     <div className="text-gray-500">Cargando historial...</div>
                   </div>
                 ) : historyError ? (
                   <div className="flex justify-center items-center py-8 text-red-500">
                     Error: {historyError}
                   </div>
                 ) : (
                   // --- Tabs solicitadas: Tratamientos, Potreros y Enfermedades ---
                   <div className="flex flex-col h-full">
                     <Tabs defaultValue="treatments" className="flex flex-col h-full">
                       <TabsList className="grid w-full grid-cols-5 shrink-0 mb-0">
                         <TabsTrigger value="timeline">Línea de tiempo</TabsTrigger>
                         <TabsTrigger value="treatments">Tratamientos</TabsTrigger>
                         <TabsTrigger value="fields">Potreros</TabsTrigger>
                         <TabsTrigger value="diseases">Enfermedades</TabsTrigger>
                         <TabsTrigger value="controls">Controles</TabsTrigger>
                       </TabsList>
                       <TabsContent value="timeline" className="flex-1 overflow-y-auto px-4 py-4 mt-0">
                         {timelineEvents.length === 0 ? (
                           <div className="text-center py-6 text-muted-foreground">
                             Sin eventos en la línea de tiempo para este animal.
                           </div>
                         ) : (
                           <div className="space-y-3">
                             <ul className="space-y-3">
                               {timelineEvents.map((ev) => (
                               <li
                                 key={ev.id}
                                 className="flex items-start gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer"
                                 onClick={() => ev.previewType && ev.previewData && openPreview(ev.previewType, ev.previewData)}
                                >
                                 <span className={`mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getEventTypeClasses(ev.type)} ${ev.isVaccination ? getDueRingClasses(ev.dueStatus) : ''}`}>
                                   {ev.icon}
                                 </span>
                                 <div className="flex-1 rounded-md border p-3">
                                   <div className="flex items-center justify-between gap-3">
                                     <div className="font-medium leading-tight">{ev.title}</div>
                                     <div className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(ev.date)}</div>
                                   </div>
                                   {ev.description && (
                                     <div className="text-sm text-muted-foreground mt-1">{ev.description}</div>
                                   )}
                                   {ev.status && (
                                     <div className="mt-2">
                                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(ev.status)}`}>{ev.status}</span>
                                     </div>
                                   )}
                                   {ev.isVaccination && (ev.dueStatus === 'due_soon' || ev.dueStatus === 'overdue') && (
                                     <div className="mt-2">
                                       <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getDueBadgeClasses(ev.dueStatus)}`}>
                                         {ev.dueLabel || 'Próximo vencimiento'}
                                       </span>
                                     </div>
                                   )}
                                 </div>
                               </li>
                               ))}
                             </ul>
                           </div>
                         )}
                       </TabsContent>

                       <TabsContent value="treatments" className="flex-1 overflow-y-auto px-4 py-4 mt-0">
                         {treatmentRows.length === 0 ? (
                           <div className="text-center py-12 text-muted-foreground">
                             Sin tratamientos para este animal.
                           </div>
                         ) : (
                           <div className="space-y-3">
                             {treatmentRows.map((r, idx) => (
                               <div
                                 key={`tr-${idx}`}
                                 className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                                 onClick={() => openPreview('treatment', r)}
                               >
                                 <div className="flex items-start justify-between mb-3">
                                   <div className="flex items-center gap-2">
                                     <TypeBadge type={r.type} />
                                     {r.status && (
                                       <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                                         r.status?.toLowerCase().includes('complet') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-100' :
                                         r.status?.toLowerCase().includes('activ') || r.status?.toLowerCase().includes('progress') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100' :
                                         'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100'
                                       }`}>
                                         {r.status}
                                       </span>
                                     )}
                                   </div>
                                   <span className="text-xs text-muted-foreground whitespace-nowrap">
                                     {formatDate(r.date)}
                                   </span>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                   <div>
                                     <span className="text-xs uppercase font-bold text-muted-foreground">Descripción</span>
                                     <p className="font-medium text-foreground mt-0.5">{r.description}</p>
                                   </div>
                                   <div>
                                     <span className="text-xs uppercase font-bold text-muted-foreground">Dosis</span>
                                     <p className="font-medium text-foreground mt-0.5">{r.dose || '—'}</p>
                                   </div>
                                   <div>
                                     <span className="text-xs uppercase font-bold text-muted-foreground">Frecuencia</span>
                                     <p className="font-medium text-foreground mt-0.5">{r.frequency || '—'}</p>
                                   </div>
                                   {r.veterinarian && (
                                     <div>
                                       <span className="text-xs uppercase font-bold text-muted-foreground">Veterinario</span>
                                       <p className="font-medium text-foreground mt-0.5">{r.veterinarian}</p>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             ))}
                           </div>
                         )}
                       </TabsContent>

                       <TabsContent value="fields" className="flex-1 overflow-y-auto px-4 py-4 mt-0">
                         {fieldRows.length === 0 ? (
                           <div className="text-center py-12 text-muted-foreground">
                             Sin movimientos de campo para este animal.
                           </div>
                         ) : (
                           <div className="space-y-3">
                             {fieldRows.map((r, idx) => (
                               <div
                                 key={`fi-${idx}`}
                                 className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                                 onClick={() => openPreview('field', r)}
                               >
                                 <div className="flex items-start justify-between mb-3">
                                   <div className="flex items-center gap-2">
                                     <MapPin className="h-5 w-5 text-amber-600" />
                                     <h3 className="font-semibold text-foreground">{r.field}</h3>
                                   </div>
                                   <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                                     r.removal ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-100'
                                   }`}>
                                     {r.status || (r.removal ? 'Retirado' : 'Asignado')}
                                   </span>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                   <div>
                                     <span className="text-xs uppercase font-bold text-muted-foreground">Asignación</span>
                                     <p className="font-medium text-foreground mt-0.5">{r.assignment ? formatDate(r.assignment) : '—'}</p>
                                   </div>
                                   {r.removal && (
                                     <div>
                                       <span className="text-xs uppercase font-bold text-muted-foreground">Retiro</span>
                                       <p className="font-medium text-foreground mt-0.5">{formatDate(r.removal)}</p>
                                     </div>
                                   )}
                                   {r.duration_days !== '' && (
                                     <div>
                                       <span className="text-xs uppercase font-bold text-muted-foreground">Duración</span>
                                       <p className="font-medium text-foreground mt-0.5">{r.duration_days} días</p>
                                     </div>
                                   )}
                                 </div>
                                 {r.notes && r.notes !== '—' && (
                                   <div className="mt-3 pt-3 border-t">
                                     <span className="text-xs uppercase font-bold text-muted-foreground">Notas</span>
                                     <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>
                                   </div>
                                 )}
                               </div>
                             ))}
                           </div>
                         )}
                       </TabsContent>

                       <TabsContent value="diseases" className="flex-1 overflow-y-auto px-4 py-4 mt-0">
                         {diseaseRows.length === 0 ? (
                           <div className="text-center py-12 text-muted-foreground">
                             Sin enfermedades registradas para este animal.
                           </div>
                         ) : (
                           <div className="space-y-3">
                             {diseaseRows.map((r, idx) => (
                               <div
                                 key={`di-${idx}`}
                                 className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                                 onClick={() => openPreview('disease', r)}
                               >
                                 <div className="flex items-start justify-between mb-3">
                                   <div className="flex items-center gap-2">
                                     <Stethoscope className="h-5 w-5 text-rose-600" />
                                     <h3 className="font-semibold text-foreground">{r.disease}</h3>
                                   </div>
                                   <div className="flex items-center gap-2">
                                     {r.severity && (
                                       <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                                         r.severity?.toLowerCase().includes('grave') || r.severity?.toLowerCase().includes('sever') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-100' :
                                         r.severity?.toLowerCase().includes('moderado') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100' :
                                         'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100'
                                       }`}>
                                         {r.severity}
                                       </span>
                                     )}
                                     {r.status && (
                                       <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                                         r.status?.toLowerCase().includes('curado') || r.status?.toLowerCase().includes('recovered') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-100' :
                                         r.status?.toLowerCase().includes('activ') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-100' :
                                         'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100'
                                       }`}>
                                         {r.status}
                                       </span>
                                     )}
                                   </div>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                   <div>
                                     <span className="text-xs uppercase font-bold text-muted-foreground">Fecha de Inicio</span>
                                     <p className="font-medium text-foreground mt-0.5">{r.start ? formatDate(r.start) : '—'}</p>
                                   </div>
                                   {r.treatment && (
                                     <div className="md:col-span-2">
                                       <span className="text-xs uppercase font-bold text-muted-foreground">Tratamiento</span>
                                       <p className="font-medium text-foreground mt-0.5">{r.treatment}</p>
                                     </div>
                                   )}
                                 </div>
                                 {r.notes && (
                                   <div className="mt-3 pt-3 border-t">
                                     <span className="text-xs uppercase font-bold text-muted-foreground">Notas</span>
                                     <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>
                                   </div>
                                 )}
                               </div>
                             ))}
                           </div>
                         )}
                       </TabsContent>

                       <TabsContent value="controls" className="flex-1 overflow-y-auto px-4 py-4 mt-0">
                         {controlRows.length === 0 ? (
                           <div className="text-center py-12 text-muted-foreground">
                             Sin controles de salud para este animal.
                           </div>
                         ) : (
                           <div className="space-y-3">
                             {controlRows.map((r, idx) => (
                               <div
                                 key={`co-${idx}`}
                                 className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                                 onClick={() => openPreview('control', r)}
                               >
                                 <div className="flex items-start justify-between mb-3">
                                   <div className="flex items-center gap-2">
                                     <Activity className="h-5 w-5 text-emerald-600" />
                                     <span className="text-xs text-muted-foreground">{formatDate(r.date)}</span>
                                   </div>
                                   {r.status && (
                                     <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                                       r.status?.toLowerCase().includes('excelente') || r.status?.toLowerCase().includes('bueno') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-100' :
                                       r.status?.toLowerCase().includes('regular') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100' :
                                       r.status?.toLowerCase().includes('malo') || r.status?.toLowerCase().includes('grave') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-100' :
                                       'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100'
                                     }`}>
                                       {r.status}
                                     </span>
                                   )}
                                 </div>
                                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                   {r.weight !== '' && (
                                     <div>
                                       <span className="text-xs uppercase font-bold text-muted-foreground">Peso</span>
                                       <p className="font-medium text-foreground mt-0.5">{r.weight} kg</p>
                                     </div>
                                   )}
                                   {r.temperature !== '' && (
                                     <div>
                                       <span className="text-xs uppercase font-bold text-muted-foreground">Temp.</span>
                                       <p className="font-medium text-foreground mt-0.5">{r.temperature} °C</p>
                                     </div>
                                   )}
                                   {r.heart_rate !== '' && (
                                     <div>
                                       <span className="text-xs uppercase font-bold text-muted-foreground">FC</span>
                                       <p className="font-medium text-foreground mt-0.5">{r.heart_rate} lpm</p>
                                     </div>
                                   )}
                                   {r.respiratory_rate !== '' && (
                                     <div>
                                       <span className="text-xs uppercase font-bold text-muted-foreground">FR</span>
                                       <p className="font-medium text-foreground mt-0.5">{r.respiratory_rate} rpm</p>
                                     </div>
                                   )}
                                 </div>
                                 {(r.veterinarian || r.next_control_date) && (
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3">
                                     {r.veterinarian && (
                                       <div>
                                         <span className="text-xs uppercase font-bold text-muted-foreground">Veterinario</span>
                                         <p className="font-medium text-foreground mt-0.5">{r.veterinarian}</p>
                                       </div>
                                     )}
                                     {r.next_control_date && (
                                       <div>
                                         <span className="text-xs uppercase font-bold text-muted-foreground">Próximo Control</span>
                                         <p className="font-medium text-foreground mt-0.5">{formatDate(r.next_control_date)}</p>
                                       </div>
                                     )}
                                   </div>
                                 )}
                                 {r.notes && (
                                   <div className="mt-3 pt-3 border-t">
                                     <span className="text-xs uppercase font-bold text-muted-foreground">Notas</span>
                                     <p className="text-sm text-muted-foreground mt-1">{r.notes}</p>
                                   </div>
                                 )}
                               </div>
                             ))}
                           </div>
                         )}
                       </TabsContent>
                     </Tabs>
                   </div>
                 )}
               </div>


         </ModalBody>
       </ModalContent>
     </Modal>
     {previewOpen && (
       <Modal
         isOpen={previewOpen}
         onClose={closePreview}
         size="5xl"
         description={`Vista previa • ${getAnimalLabel(animal)}`}
       >
         <ModalHeader>
           Vista previa{previewType && (
             <>
               {" – "}
               {previewType === 'treatment'
                 ? 'Tratamiento'
                 : previewType === 'field'
                 ? 'Movimiento de Campo'
                 : previewType === 'disease'
                 ? 'Enfermedad'
                 : 'Control de Salud'}
             </>
           )}
         </ModalHeader>
         <ModalContent>
           <ModalBody>
             <PreviewContent />
           </ModalBody>
         </ModalContent>
       </Modal>
     )}
     </>
   );
};
