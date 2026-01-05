import { BaseService } from '@/shared/api/base-service';
import type { DiseaseInput, PaginatedResponse, DiseaseResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the diseases API.
 * @extends {BaseService<Disease>}
 */
export class DiseaseService extends BaseService<DiseaseResponse> {
  /**
   * Creates an instance of DiseaseService.
   */
  constructor() {
    super('diseases');
  }

  /**
   * Retrieves a paginated list of diseases.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<DiseaseResponse>>} A promise that resolves to the paginated list of diseases.
   */
  public async getDiseases(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<DiseaseResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single disease by its ID.
   * @param {string} id - The ID of the disease to retrieve.
   * @returns {Promise<DiseaseResponse>} A promise that resolves to the requested disease.
   */
  public async getDiseaseById(id: string): Promise<DiseaseResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new disease.
   * @param {Omit<Disease, 'id'>} diseaseData - The data for the new disease.
   * @returns {Promise<DiseaseResponse>} A promise that resolves to the created disease.
   */
  public async createDisease(diseaseData: DiseaseInput): Promise<DiseaseResponse> {
    return this.create(diseaseData);
  }

  /**
   * Updates an existing disease.
   * @param {string} id - The ID of the disease to update.
   * @param {Partial<Disease>} diseaseData - The data to update the disease with.
   * @returns {Promise<DiseaseResponse>} A promise that resolves to the updated disease.
   */
  public async updateDisease(id: string, diseaseData: Partial<DiseaseInput>): Promise<DiseaseResponse> {
    return this.update(id, diseaseData);
  }

  /**
   * Partially updates an existing disease.
   * @param {string} id - The ID of the disease to update.
   * @param {Partial<DiseaseInput>} diseaseData - The data to update the disease with.
   * @returns {Promise<DiseaseResponse>} A promise that resolves to the updated disease.
   */
  public async patchDisease(id: string, diseaseData: Partial<DiseaseInput>): Promise<DiseaseResponse> {
    return this.patch(id, diseaseData);
  }

  /**
   * Deletes a disease by its ID.
   * @param {string} id - The ID of the disease to delete.
   * @returns {Promise<boolean>} A promise that resolves when the disease is deleted.
   */
  public async deleteDisease(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple diseases in a single request.
   * @param {DiseaseInput[]} data - An array of disease data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: DiseaseInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the diseases.
   * @returns {Promise<any>} A promise that resolves to the disease statistics.
   */
  public async getDiseasesStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const diseaseService = new DiseaseService();
