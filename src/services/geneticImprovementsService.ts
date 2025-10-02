import { BaseService } from './baseService';
import type { GeneticImprovementInput, PaginatedResponse, GeneticImprovementResponse } from '@/types/swaggerTypes';

/**
 * Service class for interacting with the genetic improvements API.
 * @extends {BaseService<GeneticImprovementResponse>}
 */
export class GeneticImprovementsService extends BaseService<GeneticImprovementResponse> {
  /**
   * Creates an instance of GeneticImprovementsService.
   */
  constructor() {
    super('genetic-improvements');
  }

  /**
   * Retrieves a paginated list of genetic improvements.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<GeneticImprovementResponse>>} A promise that resolves to the paginated list of genetic improvements.
   */
  public async getGeneticImprovements(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<GeneticImprovementResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single genetic improvement by its ID.
   * @param {string} id - The ID of the genetic improvement to retrieve.
   * @returns {Promise<GeneticImprovementResponse>} A promise that resolves to the requested genetic improvement.
   */
  public async getGeneticImprovementById(id: string): Promise<GeneticImprovementResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new genetic improvement.
   * @param {GeneticImprovementInput} geneticImprovementData - The data for the new genetic improvement.
   * @returns {Promise<GeneticImprovementResponse>} A promise that resolves to the created genetic improvement.
   */
  public async createGeneticImprovement(geneticImprovementData: GeneticImprovementInput): Promise<GeneticImprovementResponse> {
    return this.create(geneticImprovementData);
  }

  /**
   * Updates an existing genetic improvement.
   * @param {string} id - The ID of the genetic improvement to update.
   * @param {Partial<GeneticImprovementInput>} geneticImprovementData - The data to update the genetic improvement with.
   * @returns {Promise<GeneticImprovementResponse>} A promise that resolves to the updated genetic improvement.
   */
  public async updateGeneticImprovement(id: string, geneticImprovementData: Partial<GeneticImprovementInput>): Promise<GeneticImprovementResponse> {
    return this.update(id, geneticImprovementData);
  }

  /**
   * Partially updates an existing genetic improvement.
   * @param {string} id - The ID of the genetic improvement to update.
   * @param {Partial<GeneticImprovementInput>} geneticImprovementData - The data to update the genetic improvement with.
   * @returns {Promise<GeneticImprovementResponse>} A promise that resolves to the updated genetic improvement.
   */
  public async patchGeneticImprovement(id: string, geneticImprovementData: Partial<GeneticImprovementInput>): Promise<GeneticImprovementResponse> {
    return this.patch(id, geneticImprovementData);
  }

  /**
   * Deletes a genetic improvement by its ID.
   * @param {string} id - The ID of the genetic improvement to delete.
   * @returns {Promise<boolean>} A promise that resolves when the genetic improvement is deleted.
   */
  public async deleteGeneticImprovement(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple genetic improvements in a single request.
   * @param {GeneticImprovementInput[]} data - An array of genetic improvement data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: GeneticImprovementInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the genetic improvements.
   * @returns {Promise<any>} A promise that resolves to the genetic improvement statistics.
   */
  public async getGeneticImprovementsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const geneticImprovementsService = new GeneticImprovementsService();
