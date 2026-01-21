import { treatmentVaccinesService } from '@/entities/treatment-vaccine/api/treatmentVaccines.service';
import { apiFetch } from '@/shared/api/apiFetch';

jest.mock('@/shared/api/apiFetch', () => ({
  __esModule: true,
  apiFetch: jest.fn(),
}));

const mockApiFetch = apiFetch as unknown as jest.Mock;

describe('TreatmentVaccinesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createTreatmentVaccine usa POST al endpoint correcto', async () => {
    const payload = { treatment_id: 1, vaccine_id: 2, dose: '1 dosis' };
    mockApiFetch.mockResolvedValue({ data: { id: 42, ...payload } } as any);
    const result = await treatmentVaccinesService.createTreatmentVaccine(payload as any);
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-vaccines', method: 'POST', data: payload }));
    expect(result).toMatchObject({ id: 42, treatment_id: 1, vaccine_id: 2, dose: '1 dosis' });
  });

  it('patchTreatmentVaccine usa PATCH con id en la ruta', async () => {
    mockApiFetch.mockResolvedValue({ data: { id: 123, dose: '2 dosis' } } as any);
    const result = await treatmentVaccinesService.patchTreatmentVaccine('123', { dose: '2 dosis' } as any);
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-vaccines/123', method: 'PATCH', data: { dose: '2 dosis' } }));
    expect(result).toMatchObject({ id: 123, dose: '2 dosis' });
  });

  it('deleteTreatmentVaccine usa DELETE y retorna true', async () => {
    mockApiFetch.mockResolvedValue({ data: {} } as any);
    const ok = await treatmentVaccinesService.deleteTreatmentVaccine('123');
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-vaccines/123', method: 'DELETE' }));
    expect(ok).toBe(true);
  });

  it('createBulk usa POST a /bulk', async () => {
    const bulk = [{ treatment_id: 5, vaccine_id: 7, dose: '1 dosis' }];
    mockApiFetch.mockResolvedValue({ data: { success: true } } as any);
    const resp = await treatmentVaccinesService.createBulk(bulk as any);
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-vaccines/bulk', method: 'POST', data: bulk }));
    expect(resp).toMatchObject({ success: true });
  });

  it('getTreatmentVaccines usa GET con paginación', async () => {
    mockApiFetch.mockResolvedValue({ data: { data: [], total: 0, page: 2, per_page: 10, totalPages: 1, hasNextPage: false, hasPreviousPage: true } } as any);
    const page = await treatmentVaccinesService.getTreatmentVaccines({ page: 2, limit: 10 });
    expect(mockApiFetch).toHaveBeenCalledWith(expect.objectContaining({ url: 'treatment-vaccines', method: 'GET', params: expect.objectContaining({ page: 2, limit: 10 }) }));
    expect(page).toMatchObject({ data: [], page: 1, limit: 10 });
  });
});

