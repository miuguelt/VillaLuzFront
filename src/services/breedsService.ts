import { BaseService } from './baseService';
import type { BreedInput, PaginatedResponse, BreedResponse } from '@/types/swaggerTypes';

/**
 * Service class for interacting with the breeds API.
 * @extends {BaseService<Breed>}
 */
export class BreedsService extends BaseService<BreedResponse> {
  /**
   * Creates an instance of BreedsService.
   */
  constructor() {
    super('breeds');
  }

  /**
   * Retrieves a paginated list of breeds.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @param {string} [options.sort] - The sorting criteria.
   * @param {string} [options.search] - Optional search query to filter breeds.
   * @returns {Promise<PaginatedResponse<BreedResponse>>} A promise that resolves to the paginated list of breeds.
   */
  public async getBreeds(options: { page?: number; limit?: number; sort?: string; search?: string } = {}): Promise<PaginatedResponse<BreedResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single breed by its ID.
   * @param {string} id - The ID of the breed to retrieve.
   * @returns {Promise<BreedResponse>} A promise that resolves to the requested breed.
   */
  public async getBreedById(id: string): Promise<BreedResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new breed.
   * @param {Omit<Breed, 'id'>} breedData - The data for the new breed.
   * @returns {Promise<BreedResponse>} A promise that resolves to the created breed.
   */
  public async createBreed(breedData: BreedInput): Promise<BreedResponse> {
    return this.create(breedData);
  }

  /**
   * Updates an existing breed.
   * @param {string} id - The ID of the breed to update.
   * @param {Partial<BreedInput>} breedData - The data to update the breed with.
   * @returns {Promise<BreedResponse>} A promise that resolves to the updated breed.
   */
  public async updateBreed(id: string, breedData: Partial<BreedInput>): Promise<BreedResponse> {
    return this.update(id, breedData);
  }

  /**
   * Partially updates an existing breed.
   * @param {string} id - The ID of the breed to update.
   * @param {Partial<BreedInput>} breedData - The data to update the breed with.
   * @returns {Promise<BreedResponse>} A promise that resolves to the updated breed.
   */
  public async patchBreed(id: string, breedData: Partial<BreedInput>): Promise<BreedResponse> {
    return this.patch(id, breedData);
  }

  /**
   * Deletes a breed by its ID.
   * @param {string} id - The ID of the breed to delete.
   * @returns {Promise<boolean>} A promise that resolves when the breed is deleted.
   */
  public async deleteBreed(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple breeds in a single request.
   * @param {BreedInput[]} data - An array of breed data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: BreedInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves breeds for a specific species.
   * @param {string} speciesId - The ID of the species.
   * @returns {Promise<BreedResponse[]>} A promise that resolves to a list of breeds for the given species.
   */
  public async getBreedsBySpecies(speciesId: string): Promise<BreedResponse[]> {
    return this.customRequest<BreedResponse[]>(`by-species/${speciesId}`, 'GET');
  }

  /**
   * Retrieves statistics for the breeds.
   * @returns {Promise<any>} A promise that resolves to the breed statistics.
   */
  public async getBreedsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const breedsService = new BreedsService();

