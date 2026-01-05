import { BaseService } from '@/shared/api/base-service';
import type { AnimalFieldInput, PaginatedResponse, AnimalFieldResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the animal fields API.
 * @extends {BaseService<AnimalFieldResponse>}
 */
export class AnimalFieldsService extends BaseService<AnimalFieldResponse> {
  /**
   * Creates an instance of AnimalFieldsService.
   */
  constructor() {
    super('animal-fields');
  }

  /**
   * Retrieves a paginated list of animal fields.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<AnimalFieldResponse>>} A promise that resolves to the paginated list of animal fields.
   */
  public async getAnimalFields(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<AnimalFieldResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single animal field by its ID.
   * @param {string} id - The ID of the animal field to retrieve.
   * @returns {Promise<AnimalFieldResponse>} A promise that resolves to the requested animal field.
   */
  public async getAnimalFieldById(id: string): Promise<AnimalFieldResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new animal field.
   * @param {AnimalFieldInput} animalFieldData - The data for the new animal field.
   * @returns {Promise<AnimalFieldResponse>} A promise that resolves to the created animal field.
   */
  public async createAnimalField(animalFieldData: AnimalFieldInput): Promise<AnimalFieldResponse> {
    return this.create(animalFieldData);
  }

  /**
   * Updates an existing animal field.
   * @param {string} id - The ID of the animal field to update.
   * @param {Partial<AnimalFieldInput>} animalFieldData - The data to update the animal field with.
   * @returns {Promise<AnimalFieldResponse>} A promise that resolves to the updated animal field.
   */
  public async updateAnimalField(id: string, animalFieldData: Partial<AnimalFieldInput>): Promise<AnimalFieldResponse> {
    return this.update(id, animalFieldData);
  }

  /**
   * Partially updates an existing animal field.
   * @param {string} id - The ID of the animal field to update.
   * @param {Partial<AnimalFieldInput>} animalFieldData - The data to update the animal field with.
   * @returns {Promise<AnimalFieldResponse>} A promise that resolves to the updated animal field.
   */
  public async patchAnimalField(id: string, animalFieldData: Partial<AnimalFieldInput>): Promise<AnimalFieldResponse> {
    return this.patch(id, animalFieldData);
  }

  /**
   * Deletes an animal field by its ID.
   * @param {string} id - The ID of the animal field to delete.
   * @returns {Promise<boolean>} A promise that resolves when the animal field is deleted.
   */
  public async deleteAnimalField(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple animal fields in a single request.
   * @param {AnimalFieldInput[]} data - An array of animal field data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: AnimalFieldInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the animal fields.
   * @returns {Promise<any>} A promise that resolves to the animal field statistics.
   */
  public async getAnimalFieldsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const animalFieldsService = new AnimalFieldsService();
