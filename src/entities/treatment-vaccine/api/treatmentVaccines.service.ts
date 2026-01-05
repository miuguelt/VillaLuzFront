import { BaseService } from '@/shared/api/base-service';
import type { TreatmentVaccineInput, PaginatedResponse, TreatmentVaccineResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the treatment vaccines API.
 * @extends {BaseService<TreatmentVaccineResponse>}
 */
export class TreatmentVaccinesService extends BaseService<TreatmentVaccineResponse> {
  /**
   * Creates an instance of TreatmentVaccinesService.
   */
  constructor() {
    super('treatment-vaccines');
  }

  /**
   * Retrieves a paginated list of treatment vaccines.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<TreatmentVaccineResponse>>} A promise that resolves to the paginated list of treatment vaccines.
   */
  public async getTreatmentVaccines(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<TreatmentVaccineResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single treatment vaccine by its ID.
   * @param {string} id - The ID of the treatment vaccine to retrieve.
   * @returns {Promise<TreatmentVaccineResponse>} A promise that resolves to the requested treatment vaccine.
   */
  public async getTreatmentVaccineById(id: string): Promise<TreatmentVaccineResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new treatment vaccine.
   * @param {TreatmentVaccineInput} treatmentVaccineData - The data for the new treatment vaccine.
   * @returns {Promise<TreatmentVaccineResponse>} A promise that resolves to the created treatment vaccine.
   */
  public async createTreatmentVaccine(treatmentVaccineData: TreatmentVaccineInput): Promise<TreatmentVaccineResponse> {
    return this.create(treatmentVaccineData);
  }

  /**
   * Updates an existing treatment vaccine.
   * @param {string} id - The ID of the treatment vaccine to update.
   * @param {Partial<TreatmentVaccineInput>} treatmentVaccineData - The data to update the treatment vaccine with.
   * @returns {Promise<TreatmentVaccineResponse>} A promise that resolves to the updated treatment vaccine.
   */
  public async updateTreatmentVaccine(id: string, treatmentVaccineData: Partial<TreatmentVaccineInput>): Promise<TreatmentVaccineResponse> {
    return this.update(id, treatmentVaccineData);
  }

  /**
   * Partially updates an existing treatment vaccine.
   * @param {string} id - The ID of the treatment vaccine to update.
   * @param {Partial<TreatmentVaccineInput>} treatmentVaccineData - The data to update the treatment vaccine with.
   * @returns {Promise<TreatmentVaccineResponse>} A promise that resolves to the updated treatment vaccine.
   */
  public async patchTreatmentVaccine(id: string, treatmentVaccineData: Partial<TreatmentVaccineInput>): Promise<TreatmentVaccineResponse> {
    return this.patch(id, treatmentVaccineData);
  }

  /**
   * Deletes a treatment vaccine by its ID.
   * @param {string} id - The ID of the treatment vaccine to delete.
   * @returns {Promise<boolean>} A promise that resolves when the treatment vaccine is deleted.
   */
  public async deleteTreatmentVaccine(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple treatment vaccines in a single request.
   * @param {TreatmentVaccineInput[]} data - An array of treatment vaccine data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: TreatmentVaccineInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the treatment vaccines.
   * @returns {Promise<any>} A promise that resolves to the treatment vaccine statistics.
   */
  public async getTreatmentVaccinesStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const treatmentVaccinesService = new TreatmentVaccinesService();

