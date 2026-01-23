import { BaseService } from '@/shared/api/base-service';
import type { VaccinationInput, PaginatedResponse, VaccinationResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the vaccinations API.
 * @extends {BaseService<VaccinationResponse>}
 */
export class VaccinationsService extends BaseService<VaccinationResponse> {
  /**
   * Creates an instance of VaccinationsService.
   */
  constructor() {
    super('vaccinations');
  }

  /**
   * Retrieves a paginated list of vaccinations.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<VaccinationResponse>>} A promise that resolves to the paginated list of vaccinations.
   */
  public async getVaccinations(options: { page?: number; limit?: number;[key: string]: any } = {}): Promise<PaginatedResponse<VaccinationResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single vaccination by its ID.
   * @param {string} id - The ID of the vaccination to retrieve.
   * @returns {Promise<VaccinationResponse>} A promise that resolves to the requested vaccination.
   */
  public async getVaccinationById(id: string): Promise<VaccinationResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new vaccination.
   * @param {VaccinationInput} vaccinationData - The data for the new vaccination.
   * @returns {Promise<VaccinationResponse>} A promise that resolves to the created vaccination.
   */
  public async createVaccination(vaccinationData: VaccinationInput): Promise<VaccinationResponse> {
    return this.create(vaccinationData);
  }

  /**
   * Updates an existing vaccination.
   * @param {string} id - The ID of the vaccination to update.
   * @param {Partial<VaccinationInput>} vaccinationData - The data to update the vaccination with.
   * @returns {Promise<VaccinationResponse>} A promise that resolves to the updated vaccination.
   */
  public async updateVaccination(id: string, vaccinationData: Partial<VaccinationInput>): Promise<VaccinationResponse> {
    return this.update(id, vaccinationData);
  }

  /**
   * Partially updates an existing vaccination.
   * @param {string} id - The ID of the vaccination to update.
   * @param {Partial<VaccinationInput>} vaccinationData - The data to update the vaccination with.
   * @returns {Promise<VaccinationResponse>} A promise that resolves to the updated vaccination.
   */
  public async patchVaccination(id: string, vaccinationData: Partial<VaccinationInput>): Promise<VaccinationResponse> {
    return this.patch(id, vaccinationData);
  }

  /**
   * Deletes a vaccination by its ID.
   * @param {string} id - The ID of the vaccination to delete.
   * @returns {Promise<boolean>} A promise that resolves when the vaccination is deleted.
   */
  public async deleteVaccination(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple vaccinations in a single request.
   * @param {VaccinationInput[]} data - An array of vaccination data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: VaccinationInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the vaccinations.
   * @returns {Promise<any>} A promise that resolves to the vaccination statistics.
   */
  public async getVaccinationsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const vaccinationsService = new VaccinationsService();
