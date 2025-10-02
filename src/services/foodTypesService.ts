import { BaseService } from './baseService';
import type { FoodTypeInput, PaginatedResponse, FoodTypeResponse } from '@/types/swaggerTypes';

/**
 * Service class for interacting with the food types API.
 * @extends {BaseService<FoodType>}
 */
export class FoodTypesService extends BaseService<FoodTypeResponse> {
  /**
   * Creates an instance of FoodTypesService.
   */
  constructor() {
    super('food_types');
  }

  /**
   * Retrieves a paginated list of food types.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<FoodTypeResponse>>} A promise that resolves to the paginated list of food types.
   */
  public async getFoodTypes(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<FoodTypeResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single food type by its ID.
   * @param {string} id - The ID of the food type to retrieve.
   * @returns {Promise<FoodTypeResponse>} A promise that resolves to the requested food type.
   */
  public async getFoodTypeById(id: string): Promise<FoodTypeResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new food type.
   * @param {Omit<FoodType, 'id'>} foodTypeData - The data for the new food type.
   * @returns {Promise<FoodTypeResponse>} A promise that resolves to the created food type.
   */
  public async createFoodType(foodTypeData: FoodTypeInput): Promise<FoodTypeResponse> {
    return this.create(foodTypeData);
  }

  /**
   * Updates an existing food type.
   * @param {string} id - The ID of the food type to update.
   * @param {Partial<FoodType>} foodTypeData - The data to update the food type with.
   * @returns {Promise<FoodTypeResponse>} A promise that resolves to the updated food type.
   */
  public async updateFoodType(id: string, foodTypeData: Partial<FoodTypeInput>): Promise<FoodTypeResponse> {
    return this.update(id, foodTypeData);
  }

  /**
   * Partially updates an existing food type.
   * @param {string} id - The ID of the food type to update.
   * @param {Partial<FoodTypeInput>} foodTypeData - The data to update the food type with.
   * @returns {Promise<FoodTypeResponse>} A promise that resolves to the updated food type.
   */
  public async patchFoodType(id: string, foodTypeData: Partial<FoodTypeInput>): Promise<FoodTypeResponse> {
    return this.patch(id, foodTypeData);
  }

  /**
   * Deletes a food type by its ID.
   * @param {string} id - The ID of the food type to delete.
   * @returns {Promise<boolean>} A promise that resolves when the food type is deleted.
   */
  public async deleteFoodType(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple food types in a single request.
   * @param {FoodTypeInput[]} data - An array of food type data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: FoodTypeInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the food types.
   * @returns {Promise<any>} A promise that resolves to the food type statistics.
   */
  public async getFoodTypesStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const foodTypesService = new FoodTypesService();
