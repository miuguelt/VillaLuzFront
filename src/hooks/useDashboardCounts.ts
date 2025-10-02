import { useEffect, useMemo, useState } from 'react'
// Métricas basadas 100% en servicios que leen de BD
import { usersService } from '@/services/userService'
import { animalsService } from '@/services/animalService'
import { controlService } from '@/services/controlService'
import { fieldService } from '@/services/fieldService'
import { vaccinationsService } from '@/services/vaccinationsService'
import { vaccinesService } from '@/services/vaccinesService'
import { medicationsService } from '@/services/medicationsService'
import { diseaseService } from '@/services/diseaseService'
import { speciesService } from '@/services/speciesService'
import { breedsService } from '@/services/breedsService'
import { animalFieldsService } from '@/services/animalFieldsService'
import { animalDiseasesService } from '@/services/animalDiseasesService'
import { geneticImprovementsService } from '@/services/geneticImprovementsService'
import { treatmentMedicationService } from '@/services/treatmentMedicationService'
import { treatmentVaccinesService } from '@/services/treatmentVaccinesService'
import { foodTypesService } from '@/services/foodTypesService'

type Counts = {
  usersRegistered: number
  usersActive: number
  animalsRegistered: number
  activeTreatments: number
  pendingTasks: number
  systemAlerts: number
  treatmentsTotal: number
  vaccinationsApplied: number
  controlsPerformed: number
  fieldsRegistered: number
  vaccinesCount: number
  medicationsCount: number
  diseasesCount: number
  speciesCount: number
  breedsCount: number
  animalFieldsCount: number
  animalDiseasesCount: number
  geneticImprovementsCount: number
  treatmentMedicationsCount: number
  treatmentVaccinesCount: number
  foodTypesCount: number
}

const initialCounts: Counts = {
  usersRegistered: 0,
  usersActive: 0,
  animalsRegistered: 0,
  activeTreatments: 0,
  pendingTasks: 0,
  systemAlerts: 0,
  treatmentsTotal: 0,
  vaccinationsApplied: 0,
  controlsPerformed: 0,
  fieldsRegistered: 0,
  vaccinesCount: 0,
  medicationsCount: 0,
  diseasesCount: 0,
  speciesCount: 0,
  breedsCount: 0,
  animalFieldsCount: 0,
  animalDiseasesCount: 0,
  geneticImprovementsCount: 0,
  treatmentMedicationsCount: 0,
  treatmentVaccinesCount: 0,
  foodTypesCount: 0,
}

export function useDashboardCounts() {
  const [counts, setCounts] = useState<Counts>(initialCounts)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    const getTotal = (res: { total?: number } | undefined) => Number(res?.total || 0)

  const fetchAll = async () => {
      try {
        // Stats directos desde servicios (evita paginados y caché de listas)
        const [
          treatmentsStats,
          vaccinationsStats,
          treatmentVaccinesStats,
          usersStats,
          animalsStats,
          controlsStats,
          fieldsStats,
          vaccinesStats,
          medicationsStats,
          diseasesStats,
          speciesStats,
          breedsStats,
          animalFieldsStats,
          animalDiseasesStats,
          geneticImprovementsStats,
          treatmentMedicationsStats,
          treatmentVaccinesStatsCatalog,
          foodTypesStats,
        ] = await Promise.all([
          (await import('@/services/treatmentsService')).treatmentsService.getTreatmentsStats().catch(() => ({ } as any)),
          vaccinationsService.getVaccinationsStats().catch(() => ({ } as any)),
          treatmentVaccinesService.getTreatmentVaccinesStats().catch(() => ({ } as any)),
          usersService.getUserStats().catch(() => ({ } as any)),
          animalsService.getAnimalStats().catch(() => ({ } as any)),
          controlService.getControlsStats().catch(() => ({ } as any)),
          fieldService.getFieldsStats().catch(() => ({ } as any)),
          vaccinesService.getVaccinesStats().catch(() => ({ } as any)),
          medicationsService.getMedicationsStats().catch(() => ({ } as any)),
          diseaseService.getDiseasesStats().catch(() => ({ } as any)),
          speciesService.getSpeciesStats().catch(() => ({ } as any)),
          breedsService.getBreedsStats().catch(() => ({ } as any)),
          animalFieldsService.getAnimalFieldsStats().catch(() => ({ } as any)),
          animalDiseasesService.getAnimalDiseasesStats().catch(() => ({ } as any)),
          geneticImprovementsService.getGeneticImprovementsStats().catch(() => ({ } as any)),
          treatmentMedicationService.getTreatmentMedicationsStats().catch(() => ({ } as any)),
          treatmentVaccinesService.getTreatmentVaccinesStats().catch(() => ({ } as any)),
          foodTypesService.getFoodTypesStats().catch(() => ({ } as any)),
        ])

        // Funciones helpers para extraer totales de respuestas variables
        const pickNumber = (obj: any, keys: string[], fallback = 0): number => {
          for (const k of keys) {
            const v = (obj ?? {})[k]
            if (typeof v === 'number' && !isNaN(v)) return v
          }
          // Buscar en summary si existe
          const summary = (obj ?? {}).summary
          if (summary && typeof summary === 'object') {
            for (const k of keys) {
              const v = (summary as any)[k]
              if (typeof v === 'number' && !isNaN(v)) return v
            }
          }
          return fallback
        }

        const getTotalFromStats = (stats: any, candidates: string[]): number => {
          return pickNumber(stats, ['total', ...candidates])
        }

        // Alertas del sistema: se delega al AdminDashboard (fetchAlerts)
        const alertsCount = 0

        const nextCounts: Counts = {
          usersRegistered: pickNumber(usersStats, ['total_users', 'total']),
          usersActive: pickNumber(usersStats, ['active_users', 'active']),
          animalsRegistered: getTotalFromStats(animalsStats, ['total_animals']),
          // Active treatments desde stats de tratamientos
          activeTreatments:
            Number(
              pickNumber(treatmentsStats, ['active_treatments', 'active'])
              ?? 0
            ),
          // Tareas pendientes: priorizamos pendientes de vacunación
          pendingTasks:
            Number(
              pickNumber(treatmentVaccinesStats, ['pending_vaccinations', 'pending'])
              ?? pickNumber(vaccinationsStats, ['pending_vaccinations', 'pending'])
              ?? 0
            ),
          systemAlerts: alertsCount,
          treatmentsTotal: getTotalFromStats(treatmentsStats, ['total_treatments']),
          vaccinationsApplied: getTotalFromStats(vaccinationsStats, ['total_vaccinations']),
          controlsPerformed: getTotalFromStats(controlsStats, ['total_controls']),
          fieldsRegistered: getTotalFromStats(fieldsStats, ['total_fields']),
          vaccinesCount: getTotalFromStats(vaccinesStats, ['total_vaccines']),
          medicationsCount: getTotalFromStats(medicationsStats, ['total_medications']),
          diseasesCount: getTotalFromStats(diseasesStats, ['total_diseases']),
          speciesCount: getTotalFromStats(speciesStats, ['total_species']),
          breedsCount: getTotalFromStats(breedsStats, ['total_breeds']),
          animalFieldsCount: getTotalFromStats(animalFieldsStats, ['total_animal_fields', 'total_fields', 'total']),
          animalDiseasesCount: getTotalFromStats(animalDiseasesStats, ['total_animal_diseases', 'total_diseases', 'total']),
          geneticImprovementsCount: getTotalFromStats(geneticImprovementsStats, ['total_genetic_improvements', 'total_improvements', 'total']),
          treatmentMedicationsCount: getTotalFromStats(treatmentMedicationsStats, ['total_treatment_medications', 'total_medications', 'total']),
          treatmentVaccinesCount: getTotalFromStats(treatmentVaccinesStatsCatalog, ['total_treatment_vaccines', 'total_vaccines', 'total']),
          foodTypesCount: getTotalFromStats(foodTypesStats, ['total_food_types', 'total_types', 'total']),
        }

        if (mounted) setCounts(nextCounts)
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Error cargando contadores')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchAll()
    return () => { mounted = false }
  }, [])

  const safeCounts = useMemo(() => counts, [counts])

  return { counts: safeCounts, loading, error }
}

export type { Counts }