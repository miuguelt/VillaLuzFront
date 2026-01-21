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
    spyMedicationsGetAll.mockResolvedValue({ data: [{ id: 11, name: 'Medicamento #11' }] } as any)
    spyTreatmentVaccinesGetAll.mockResolvedValue({ data: [{ id: 18, treatment_id: 41, vaccine_id: 8, vaccine_name: 'Vacuna #8' }], total: 1, page: 1, limit: 10, totalPages: 1 } as any)
    spyTreatmentMedicationsGetAll.mockResolvedValue({ data: [{ id: 19, treatment_id: 41, medication_id: 11, medication_name: 'Medicamento #11' }], total: 1, page: 1, limit: 10, totalPages: 1 } as any)
    spyAnimalsGet.mockResolvedValue({ data: [{ id: 1, record: 'Animal #1' }] } as any)
  })

  it('ubica la toolbar sticky dentro del contenedor con scroll y evita superposición lógica', async () => {
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

    const btns = screen.getAllByRole('button', { name: /ver tratamiento/i })
    fireEvent.click(btns[0])

    await waitFor(() => {
      expect(screen.getByText(/Vacunas/i)).toBeInTheDocument()
      expect(screen.getByText(/Medicamentos/i)).toBeInTheDocument()
    })

    const toggles = await screen.findAllByText('Mostrar solo seleccionados')
    expect(toggles.length).toBeGreaterThan(0)

    for (const labelEl of toggles) {
      let toolbarEl: HTMLElement | null = labelEl.closest('div')
      // Ascender hasta el contenedor con clase sticky
      while (toolbarEl && !((toolbarEl.className || '').includes('sticky'))) {
        toolbarEl = toolbarEl.parentElement
      }
      expect(toolbarEl).toBeTruthy()
      const cls = (toolbarEl as HTMLElement).className || ''
      expect(cls).toContain('sticky')
      expect(cls).toContain('top-0')
      expect(cls).toContain('pb-2')
      expect(cls).toContain('mb-2')

      let parent: HTMLElement | null = toolbarEl!.parentElement
      let foundScroll = false
      while (parent && !foundScroll) {
        const pcls = parent.className || ''
        if (pcls.includes('overflow-y-auto') && pcls.includes('max-h-[')) {
          foundScroll = true
          const list = parent.querySelector('ul.space-y-2')
          expect(list).toBeTruthy()
        } else {
          parent = parent.parentElement
        }
      }
      expect(foundScroll).toBe(true)
    }

    const desktopGridContainers = Array.from(document.querySelectorAll('div')).filter((d) => {
      const c = (d as HTMLElement).className || ''
      return c.includes('hidden') && c.includes('lg:grid') && c.includes('lg:grid-cols-2')
    })
    expect(desktopGridContainers.length).toBeGreaterThan(0)
  })

  it('controles funcionan: seleccionar página, limpiar y filtro de seleccionados', async () => {
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

    const btns = screen.getAllByRole('button', { name: /ver tratamiento/i })
    fireEvent.click(btns[0])

    await waitFor(() => {
      expect(screen.getByText(/Vacunas/i)).toBeInTheDocument()
      expect(screen.getByText(/Medicamentos/i)).toBeInTheDocument()
    })

    const toggleLabels = await screen.findAllByText('Mostrar solo seleccionados')
    let vacunasToolbar: HTMLElement | null = toggleLabels[0].closest('div')
    while (vacunasToolbar && !((vacunasToolbar.className || '').includes('sticky'))) {
      vacunasToolbar = vacunasToolbar.parentElement
    }
    expect(vacunasToolbar).toBeTruthy()
    let vacunasScrollContainer: HTMLElement | null = vacunasToolbar!.parentElement
    while (vacunasScrollContainer && !((vacunasScrollContainer.className || '').includes('overflow-y-auto'))) {
      vacunasScrollContainer = vacunasScrollContainer.parentElement
    }
    expect(vacunasScrollContainer).toBeTruthy()
    const vacunasList = vacunasScrollContainer!.querySelector('ul.space-y-2')!
    const vacunaItemCheckbox = vacunasList.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(vacunaItemCheckbox).toBeTruthy()
    fireEvent.click(vacunaItemCheckbox)
    await waitFor(() => {
      expect(screen.getByText(/Eliminar seleccionados \(1\)/i)).toBeInTheDocument()
    })
    const vacunaToggleCheckbox = within(vacunasToolbar!).getAllByRole('checkbox')[0] as HTMLElement
    fireEvent.click(vacunaToggleCheckbox)
    await waitFor(() => {
      const vacunaItems = Array.from(vacunasList.querySelectorAll('li'))
      expect(vacunaItems.length).toBeGreaterThan(0)
    })
    const clearVacBtn = Array.from(vacunasScrollContainer!.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Limpiar selección')) as HTMLButtonElement
    fireEvent.click(clearVacBtn)
    await waitFor(() => {
      expect(within(vacunasToolbar!).getByText(/Eliminar seleccionados \(0\)/i)).toBeTruthy()
    })

    let medsToolbar: HTMLElement | null = toggleLabels[1].closest('div')
    while (medsToolbar && !((medsToolbar.className || '').includes('sticky'))) {
      medsToolbar = medsToolbar.parentElement
    }
    expect(medsToolbar).toBeTruthy()
    let medsScrollContainer: HTMLElement | null = medsToolbar!.parentElement
    while (medsScrollContainer && !((medsScrollContainer.className || '').includes('overflow-y-auto'))) {
      medsScrollContainer = medsScrollContainer.parentElement
    }
    expect(medsScrollContainer).toBeTruthy()
    const medsList = medsScrollContainer!.querySelector('ul.space-y-2')!
    const medItemCheckbox = medsList.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(medItemCheckbox).toBeTruthy()
    fireEvent.click(medItemCheckbox)
    await waitFor(() => {
      expect(screen.getByText(/Eliminar seleccionados \(1\)/i)).toBeInTheDocument()
    })
    const medToggleCheckbox = within(medsToolbar!).getAllByRole('checkbox')[0] as HTMLElement
    fireEvent.click(medToggleCheckbox)
    await waitFor(() => {
      const medItems = Array.from(medsList.querySelectorAll('li'))
      expect(medItems.length).toBeGreaterThan(0)
    })
    const clearMedBtn = Array.from(medsScrollContainer!.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Limpiar selección')) as HTMLButtonElement
    fireEvent.click(clearMedBtn)
    await waitFor(() => {
      expect(within(medsToolbar!).getByText(/Eliminar seleccionados \(0\)/i)).toBeTruthy()
    })
  })
})
