import { useEffect, useMemo, useState } from 'react'
// Métricas basadas 100% en servicios que leen de BD
import { usersService } from '@/entities/user/api/user.service'
import { animalsService } from '@/entities/animal/api/animal.service'
import { controlService } from '@/entities/control/api/control.service'
import { fieldService } from '@/entities/field/api/field.service'
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service'
import { vaccinesService } from '@/entities/vaccine/api/vaccines.service'
import { medicationsService } from '@/entities/medication/api/medications.service'
import { diseaseService } from '@/entities/disease/api/disease.service'
import { speciesService } from '@/entities/species/api/species.service'
import { breedsService } from '@/entities/breed/api/breeds.service'
import { animalFieldsService } from '@/entities/animal-field/api/animalFields.service'
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service'
import { geneticImprovementsService } from '@/entities/genetic-improvement/api/geneticImprovements.service'
import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service'
import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service'
import { foodTypesService } from '@/entities/food-type/api/foodTypes.service'

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
          (await import('@/entities/treatment/api/treatments.service')).treatmentsService.getTreatmentsStats().catch(() => ({ } as any)),
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
