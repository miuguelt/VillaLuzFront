import { BaseService } from '@/shared/api/base-service';
import type { SpeciesInput, PaginatedResponse, SpeciesResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the species API.
 * @extends {BaseService<SpeciesResponse>}
 */
export class SpeciesService extends BaseService<SpeciesResponse> {
  /**
   * Creates an instance of SpeciesService.
   */
  constructor() {
    super('species');
  }

  /**
   * Retrieves a paginated list of species.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<SpeciesResponse>>} A promise that resolves to the paginated list of species.
   */
  public async getSpecies(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<SpeciesResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single species by its ID.
   * @param {string} id - The ID of the species to retrieve.
   * @returns {Promise<SpeciesResponse>} A promise that resolves to the requested species.
   */
  public async getSpeciesById(id: string): Promise<SpeciesResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new species.
   * @param {SpeciesInput} speciesData - The data for the new species.
   * @returns {Promise<SpeciesResponse>} A promise that resolves to the created species.
   */
  public async createSpecies(speciesData: SpeciesInput): Promise<SpeciesResponse> {
    return this.create(speciesData);
  }

  /**
   * Updates an existing species.
   * @param {string} id - The ID of the species to update.
   * @param {Partial<SpeciesInput>} speciesData - The data to update the species with.
   * @returns {Promise<SpeciesResponse>} A promise that resolves to the updated species.
   */
  public async updateSpecies(id: string, speciesData: Partial<SpeciesInput>): Promise<SpeciesResponse> {
    return this.update(id, speciesData);
  }

  /**
   * Partially updates an existing species.
   * @param {string} id - The ID of the species to update.
   * @param {Partial<SpeciesInput>} speciesData - The data to update the species with.
   * @returns {Promise<SpeciesResponse>} A promise that resolves to the updated species.
   */
  public async patchSpecies(id: string, speciesData: Partial<SpeciesInput>): Promise<SpeciesResponse> {
    return this.patch(id, speciesData);
  }

  /**
   * Deletes a species by its ID.
   * @param {string} id - The ID of the species to delete.
   * @returns {Promise<boolean>} A promise that resolves when the species is deleted.
   */
  public async deleteSpecies(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple species in a single request.
   * @param {SpeciesInput[]} data - An array of species data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: SpeciesInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the species.
   * @returns {Promise<any>} A promise that resolves to the species statistics.
   */
  public async getSpeciesStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const speciesService = new SpeciesService();
