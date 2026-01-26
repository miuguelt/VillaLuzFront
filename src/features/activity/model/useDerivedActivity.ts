import { useMemo } from 'react';

// Tipos base para compatibilidad
export type ActivityAction = 'create' | 'update' | 'delete' | 'alert' | 'system';
export type ActivitySeverity = 'low' | 'medium' | 'high';
export type ActivityEntity =
    | 'animal'
    | 'treatment'
    | 'vaccination'
    | 'control'
    | 'field'
    | 'disease'
    | 'improvement'
    | (string & {});

export interface ActivityLink {
    detail?: string;
    animal?: string;
    crud?: string;
    analytics?: string;
}

export interface ActivityItem {
    id: string; // ID único compuesto
    action: ActivityAction;
    entity: ActivityEntity;
    entity_id: number | string;
    timestamp: string; // ISO string
    ts: number; // Epoch para ordenamiento rápido
    title: string;
    summary: string;
    severity: ActivitySeverity;
    links?: ActivityLink;
    animal_id?: number;
    animal_label?: string;
}

interface UseDerivedActivityProps {
    animals?: any[];
    treatments?: any[];
    vaccinations?: any[];
    controls?: any[];
    fields?: any[];
    genetics?: any[];
    diseases?: any[];
}

export function useDerivedActivity({
    animals = [],
    treatments = [],
    vaccinations = [],
    controls = [],
    fields = [],
    genetics = [],
    diseases = []
}: UseDerivedActivityProps) {

    // Helper para convertir fechas
    const toEpochMs = (value: any): number | null => {
        if (!value) return null;
        if (typeof value === 'number') return Number.isFinite(value) ? value : null;
        if (value instanceof Date) return value.getTime();
        const parsed = new Date(String(value)).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    };

    const activityEvents = useMemo(() => {
        const now = Date.now();
        const events: ActivityItem[] = [];

        const pushEvent = (
            entity: ActivityEntity,
            entityId: number | string,
            action: ActivityAction,
            baseDate: any,
            title: string,
            summary: string,
            severity: ActivitySeverity = 'low',
            animalId?: number,
            animalLabel?: string,
            links?: ActivityLink
        ) => {
            const ts = toEpochMs(baseDate);
            if (!ts) return;

            const id = `${entity}:${entityId}:${action}:${ts}`;
            events.push({
                id,
                entity,
                entity_id: entityId,
                action,
                timestamp: new Date(ts).toISOString(),
                ts,
                title,
                summary,
                severity,
                animal_id: animalId,
                animal_label: animalLabel,
                links
            });
        };

        // 1. ANIMALES
        animals.forEach(a => {
            const animalId = Number(a.id);
            const label = a.name || a.code || a.record || 'Animal';

            // Creación / Registro
            pushEvent(
                'animal',
                a.id,
                'create',
                a.created_at || a.updated_at,
                `Animal registrado`,
                `${label} · ${a.breed?.name || ''} · ${a.gender || ''}`,
                'low',
                animalId,
                label
            );
        });

        // 2. TRATAMIENTOS
        treatments.forEach(t => {
            const animalId = t.animal_id || t.animal?.id;
            const label = t.animal_label || t.animal?.code || t.animal?.record || 'Animal';

            // Registro
            pushEvent(
                'treatment',
                t.id,
                'create',
                t.treatment_date || t.created_at,
                'Tratamiento iniciado',
                `${label} · ${t.medication?.name || 'Medicamento'} · ${t.diagnosis || ''}`,
                'medium',
                animalId,
                label
            );

            // Alerta de vencimiento / finalización
            const endTs = toEpochMs(t.end_date);
            if (endTs && endTs > 0) {
                const isOverdue = endTs < now;
                if (isOverdue) {
                    pushEvent(
                        'treatment',
                        t.id,
                        'alert',
                        endTs,
                        'Fin de tratamiento',
                        `${label} · Tratamiento finalizado o vencido`,
                        'high',
                        animalId,
                        label
                    );
                }
            }
        });

        // 3. VACUNACIONES
        vaccinations.forEach(v => {
            const animalId = v.animal_id || v.animal?.id;
            const label = v.animal_label || v.animal?.code || v.animal?.record || 'Animal';

            pushEvent(
                'vaccination',
                v.id,
                'create',
                v.application_date || v.created_at,
                'Vacuna aplicada',
                `${label} · ${v.vaccine?.name || 'Vacuna'}`,
                'low',
                animalId,
                label
            );

            // Próxima dosis
            const nextTs = toEpochMs(v.next_dose_date);
            if (nextTs && nextTs > 0) {
                const isOverdue = nextTs < now;
                const isUpcoming = !isOverdue && (nextTs - now < 7 * 24 * 60 * 60 * 1000); // 7 días

                if (isOverdue || isUpcoming) {
                    pushEvent(
                        'vaccination',
                        v.id,
                        'alert',
                        nextTs,
                        isOverdue ? 'Refuerzo vencido' : 'Próximo refuerzo',
                        `${label} · ${v.vaccine?.name || 'Vacuna'}`,
                        isOverdue ? 'high' : 'medium',
                        animalId,
                        label
                    );
                }
            }
        });

        // 4. CONTROLES
        controls.forEach(c => {
            const animalId = c.animal_id || c.animal?.id;
            const label = c.animal_label || c.animal?.code || c.animal?.record || 'Animal';

            pushEvent(
                'control',
                c.id,
                'create',
                c.checkup_date || c.created_at,
                'Control realizado',
                `${label} · ${c.health_status || 'Estado desconocido'}`,
                c.health_status === 'Enfermo' ? 'medium' : 'low',
                animalId,
                label
            );
        });

        // 5. MOVIMIENTOS / LOTES
        fields.forEach(f => {
            const animalId = f.animal_id || f.animal?.id;
            const label = f.animal_label || f.animal?.code || f.animal?.record || 'Animal';

            pushEvent(
                'field',
                f.id,
                'update',
                f.entry_date || f.created_at,
                'Traslado de lote',
                `${label} -> ${f.field?.name || 'Lote'}`,
                'low',
                animalId,
                label
            );
        });

        // 6. MEJORAS GENÉTICAS
        genetics.forEach(g => {
            const animalId = g.animal_id || g.animal?.id;
            const label = g.animal_label || g.animal?.code || g.animal?.record || 'Animal';

            pushEvent(
                'improvement',
                g.id,
                'create',
                g.date || g.created_at,
                'Mejora Genética',
                `${label} · ${g.type || 'Evento'}`,
                'low',
                animalId,
                label
            );
        });

        // 7. ENFERMEDADES
        diseases.forEach(d => {
            const animalId = d.animal_id || d.animal?.id;
            const label = d.animal_label || d.animal?.code || d.animal?.record || 'Animal';

            pushEvent(
                'disease',
                d.id,
                'create',
                d.diagnosis_date || d.created_at,
                'Diagnóstico Enfermedad',
                `${label} · ${d.disease?.name || 'Enfermedad'} · ${d.status || ''}`,
                'high',
                animalId,
                label
            );
        });

        // Ordenar descendente por fecha (más reciente primero)
        return events.sort((a, b) => b.ts - a.ts);
    }, [animals, treatments, vaccinations, controls, fields, genetics, diseases]);

    return {
        items: activityEvents,
        count: activityEvents.length,
        isEmpty: activityEvents.length === 0
    };
}
