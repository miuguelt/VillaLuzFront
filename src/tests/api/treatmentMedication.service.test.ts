import { treatmentMedicationService } from '@/entities/treatment-medication/api/treatmentMedication.service';
import { apiFetch } from '@/shared/api/apiFetch';

jest.mock('@/shared/api/apiFetch', () => ({
  __esModule: true,
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as unknown as jest.Mock;

describe('TreatmentMedicationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createTreatmentMedication usa POST al endpoint correcto', async () => {
    const payload = { treatment_id: 3, medication_id: 9 };
    mockApiFetch.mockResolvedValue({ data: { id: 11, ...payload } } as any);
    const result = await treatmentMedicationService.createTreatmentMedication(payload as any);
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-medications', method: 'POST', data: payload }));
    expect(result).toMatchObject({ id: 11, treatment_id: 3, medication_id: 9 });
  });

  it('patchTreatmentMedication usa PATCH con id en la ruta', async () => {
    mockApiFetch.mockResolvedValue({ data: { id: 55, dosage: '5 ml' } } as any);
    const result = await treatmentMedicationService.patchTreatmentMedication('55', { dosage: '5 ml' } as any);
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-medications/55', method: 'PATCH', data: { dosage: '5 ml' } }));
    expect(result).toMatchObject({ id: 55, dosage: '5 ml' });
  });

  it('deleteTreatmentMedication usa DELETE y retorna true', async () => {
    mockApiFetch.mockResolvedValue({ data: {} } as any);
    const ok = await treatmentMedicationService.deleteTreatmentMedication('77');
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-medications/77', method: 'DELETE' }));
    expect(ok).toBe(true);
  });

  it('createBulk usa POST a /bulk', async () => {
    const bulk = [{ treatment_id: 8, medication_id: 4 }];
    mockApiFetch.mockResolvedValue({ data: { success: true } } as any);
    const resp = await treatmentMedicationService.createBulk(bulk as any);
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-medications/bulk', method: 'POST', data: bulk }));
    expect(resp).toMatchObject({ success: true });
  });

  it('getTreatmentMedications usa GET con paginación', async () => {
    mockApiFetch.mockResolvedValue({ data: { data: [], total: 0, page: 1, per_page: 20, totalPages: 1, hasNextPage: false, hasPreviousPage: false } } as any);
    const page = await treatmentMedicationService.getTreatmentMedications({ page: 1, limit: 20 });
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-medications', method: 'GET', params: expect.objectContaining({ page: 1, limit: 20 }) }));
    expect(page).toMatchObject({ data: [], page: 1, limit: 10 });
  });
});
