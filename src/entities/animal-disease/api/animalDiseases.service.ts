import { BaseService } from '@/shared/api/base-service';
import type { AnimalDiseaseInput, PaginatedResponse, AnimalDiseaseResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the animal diseases API.
 * @extends {BaseService<AnimalDiseaseResponse>}
 */
export class AnimalDiseasesService extends BaseService<AnimalDiseaseResponse> {
  /**
   * Creates an instance of AnimalDiseasesService.
   */
  constructor() {
    super('animal-diseases');
  }

  /**
   * Retrieves a paginated list of animal diseases.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<AnimalDiseaseResponse>>} A promise that resolves to the paginated list of animal diseases.
   */
  public async getAnimalDiseases(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<AnimalDiseaseResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single animal disease by its ID.
   * @param {string} id - The ID of the animal disease to retrieve.
   * @returns {Promise<AnimalDiseaseResponse>} A promise that resolves to the requested animal disease.
   */
  public async getAnimalDiseaseById(id: string): Promise<AnimalDiseaseResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new animal disease.
   * @param {AnimalDiseaseInput} animalDiseaseData - The data for the new animal disease.
   * @returns {Promise<AnimalDiseaseResponse>} A promise that resolves to the created animal disease.
   */
  public async createAnimalDisease(animalDiseaseData: AnimalDiseaseInput): Promise<AnimalDiseaseResponse> {
    return this.create(animalDiseaseData);
  }

  /**
   * Updates an existing animal disease.
   * @param {string} id - The ID of the animal disease to update.
   * @param {Partial<AnimalDiseaseInput>} animalDiseaseData - The data to update the animal disease with.
   * @returns {Promise<AnimalDiseaseResponse>} A promise that resolves to the updated animal disease.
   */
  public async updateAnimalDisease(id: string, animalDiseaseData: Partial<AnimalDiseaseInput>): Promise<AnimalDiseaseResponse> {
    return this.update(id, animalDiseaseData);
  }

  /**
   * Partially updates an existing animal disease.
   * @param {string} id - The ID of the animal disease to update.
   * @param {Partial<AnimalDiseaseInput>} animalDiseaseData - The data to update the animal disease with.
   * @returns {Promise<AnimalDiseaseResponse>} A promise that resolves to the updated animal disease.
   */
  public async patchAnimalDisease(id: string, animalDiseaseData: Partial<AnimalDiseaseInput>): Promise<AnimalDiseaseResponse> {
    return this.patch(id, animalDiseaseData);
  }

  /**
   * Deletes an animal disease by its ID.
   * @param {string} id - The ID of the animal disease to delete.
   * @returns {Promise<boolean>} A promise that resolves when the animal disease is deleted.
   */
  public async deleteAnimalDisease(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple animal diseases in a single request.
   * @param {AnimalDiseaseInput[]} data - An array of animal disease data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: AnimalDiseaseInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the animal diseases.
   * @returns {Promise<any>} A promise that resolves to the animal disease statistics.
   */
  public async getAnimalDiseasesStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const animalDiseasesService = new AnimalDiseasesService();
