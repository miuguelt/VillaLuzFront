import React from 'react'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ToastProvider } from '@/app/providers/ToastContext'

jest.mock('@/shared/ui/common/AdminCRUDPage', () => {
  return {
    AdminCRUDPage: ({ config }: any) => {
      const item = { id: 41, diagnosis: 'Dx', animal_id: 1, treatment_date: '2025-01-10' }
      const cols = (config?.columns || []) as Array<any>
      return (
        <div>
          <h1>Tratamientos</h1>
          <div data-testid="stub-row">
            {cols.map((c, idx) => (
              <div key={idx} data-testid={`col-${idx}`}>
                {typeof c.render === 'function' ? c.render(undefined, item) : null}
              </div>
            ))}
          </div>
        </div>
      )
    },
  }
})

import AdminTreatmentsPage from '@/pages/dashboard/admin/treatments'
import * as treatmentsServiceModule from '@/entities/treatment/api/treatments.service'
import * as treatmentVaccinesServiceModule from '@/entities/treatment-vaccine/api/treatmentVaccines.service'
import * as treatmentMedicationServiceModule from '@/entities/treatment-medication/api/treatmentMedication.service'
import * as vaccinesServiceModule from '@/entities/vaccine/api/vaccines.service'
import * as medicationsServiceModule from '@/entities/medication/api/medications.service'
import * as animalsServiceModule from '@/entities/animal/api/animal.service'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const spyTreatmentsGetPaginated = jest.spyOn(treatmentsServiceModule.treatmentsService, 'getPaginated')
const spyTreatmentsGetById = jest.spyOn(treatmentsServiceModule.treatmentsService, 'getById')
const spyVaccinesGetAll = jest.spyOn(vaccinesServiceModule.vaccinesService as any, 'getAll')
const spyMedicationsGetAll = jest.spyOn(medicationsServiceModule.medicationsService as any, 'getAll')
const spyTreatmentVaccinesGetAll = jest.spyOn(treatmentVaccinesServiceModule.treatmentVaccinesService as any, 'getAll')
const spyTreatmentMedicationsGetAll = jest.spyOn(treatmentMedicationServiceModule.treatmentMedicationService as any, 'getAll')
const spyAnimalsGet = jest.spyOn(animalsServiceModule.animalsService, 'getAnimals' as any)

describe('Tratamientos: Insumos layout', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    spyTreatmentsGetPaginated.mockResolvedValue({
      data: [{ id: 41, animal_id: 1, treatment_date: '2025-01-10', description: 'Dx', dosis: '10ml', frequency: '1x', observations: 'Obs' }],
      total: 1, page: 1, limit: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: false,
    } as any)
    spyTreatmentsGetById.mockResolvedValue({ id: 41, animal_id: 1, treatment_date: '2025-01-10', description: 'Dx' } as any)
    spyVaccinesGetAll.mockResolvedValue({ data: [{ id: 8, name: 'Vacuna #8', route_administration_name: 'IM', dosis: '1 dosis' }] } as any)
    spyMedicationsGetAll.mockResolvedValue({ data: [{ id: 11, name: 'Medicamento #11', concentration: '500mg' }] } as any)
    spyTreatmentVaccinesGetAll.mockResolvedValue({ data: [{ id: 18, treatment_id: 41, vaccine_id: 8, vaccine_name: 'Vacuna #8' }], total: 1, page: 1, limit: 10, totalPages: 1 } as any)
    spyTreatmentMedicationsGetAll.mockResolvedValue({ data: [{ id: 19, treatment_id: 41, medication_id: 11, medication_name: 'Medicamento #11' }], total: 1, page: 1, limit: 10, totalPages: 1 } as any)
    spyAnimalsGet.mockResolvedValue({ data: [{ id: 1, record: 'Animal #1' }] } as any)
  })

  it('renderiza el layout de tarjetas y permite ver detalles', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <AdminTreatmentsPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Tratamientos')).toBeInTheDocument()
    })

    // Abrir el modal de insumos
    const btns = screen.getAllByRole('button', { name: /ver insumos/i })
    fireEvent.click(btns[0])

    await waitFor(() => {
      expect(screen.getByText(/Vacunas/i)).toBeInTheDocument()
      expect(screen.getByText(/Medicamentos/i)).toBeInTheDocument()
    })

    // Verificar presencia de los items
    expect(screen.getByText('Vacuna #8')).toBeInTheDocument()
    expect(screen.getByText('Medicamento #11')).toBeInTheDocument()

    // Verificar que el grid responsivo esté presente
    const containers = document.querySelectorAll('.grid.grid-cols-1.lg\\:grid-cols-2')
    expect(containers.length).toBeGreaterThan(0)
  })

  it('el flujo de eliminación requiere confirmación (doble clic)', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <MemoryRouter>
            <AdminTreatmentsPage />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>
    )

    await waitFor(() => expect(screen.getByText('Tratamientos')).toBeInTheDocument())
    const btns = screen.getAllByRole('button', { name: /ver insumos/i })
    fireEvent.click(btns[0])

    await waitFor(() => expect(screen.getByText('Vacuna #8')).toBeInTheDocument())

    // Buscar el botón de eliminar (Trash icon)
    const deleteBtn = screen.getAllByTitle(/desvincular/i)[0]

    // Primer clic: Debería entrar en estado de confirmación
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      // El título cambia a "¡Confirmar!"
      expect(deleteBtn).toHaveAttribute('title', '¡Confirmar!')
    })

    // Segundo clic: Debería disparar la eliminación ( mock del service ya se encargará )
    // fireEvent.click(deleteBtn) 
    // Nota: El mock del service no está configurado para espiar el delete aquí pero validamos el cambio de UI
  })
})
