import { BaseService } from './baseService';
import type { VaccineInput, PaginatedResponse, VaccineResponse } from '@/types/swaggerTypes';

/**
 * Service class for interacting with the vaccines API.
 * @extends {BaseService<VaccineResponse>}
 */
export class VaccinesService extends BaseService<VaccineResponse> {
  /**
   * Creates an instance of VaccinesService.
   */
  constructor() {
    super('vaccines');
  }

  /**
   * Retrieves a paginated list of vaccines.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<VaccineResponse>>} A promise that resolves to the paginated list of vaccines.
   */
  public async getVaccines(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<VaccineResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single vaccine by its ID.
   * @param {string} id - The ID of the vaccine to retrieve.
   * @returns {Promise<VaccineResponse>} A promise that resolves to the requested vaccine.
   */
  public async getVaccineById(id: string): Promise<VaccineResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new vaccine.
   * @param {VaccineInput} vaccineData - The data for the new vaccine.
   * @returns {Promise<VaccineResponse>} A promise that resolves to the created vaccine.
   */
  public async createVaccine(vaccineData: VaccineInput): Promise<VaccineResponse> {
    return this.create(vaccineData);
  }

  /**
   * Updates an existing vaccine.
   * @param {string} id - The ID of the vaccine to update.
   * @param {Partial<VaccineInput>} vaccineData - The data to update the vaccine with.
   * @returns {Promise<VaccineResponse>} A promise that resolves to the updated vaccine.
   */
  public async updateVaccine(id: string, vaccineData: Partial<VaccineInput>): Promise<VaccineResponse> {
    return this.update(id, vaccineData);
  }

  /**
   * Partially updates an existing vaccine.
   * @param {string} id - The ID of the vaccine to update.
   * @param {Partial<VaccineInput>} vaccineData - The data to update the vaccine with.
   * @returns {Promise<VaccineResponse>} A promise that resolves to the updated vaccine.
   */
  public async patchVaccine(id: string, vaccineData: Partial<VaccineInput>): Promise<VaccineResponse> {
    return this.patch(id, vaccineData);
  }

  /**
   * Deletes a vaccine by its ID.
   * @param {string} id - The ID of the vaccine to delete.
   * @returns {Promise<boolean>} A promise that resolves when the vaccine is deleted.
   */
  public async deleteVaccine(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple vaccines in a single request.
   * @param {VaccineInput[]} data - An array of vaccine data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: VaccineInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the vaccines.
   * @returns {Promise<any>} A promise that resolves to the vaccine statistics.
   */
  public async getVaccinesStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }

  /**
   * Retrieves vaccines by route ID.
   * @param {string} routeId - The ID of the route.
   * @returns {Promise<VaccineResponse[]>} A promise that resolves to a list of vaccines.
   */
  public async getVaccinesByRoute(routeId: string): Promise<VaccineResponse[]> {
    return this.customRequest<VaccineResponse[]>(`by-route/${routeId}`, 'GET');
  }

    /**
     * Retrieves all vaccines with their route administration information.
     * @returns {Promise<VaccineResponse[]>} A promise that resolves to a list of vaccines with route administration.
     */
    public async getVaccinesWithRouteAdministration(): Promise<VaccineResponse[]> {
        return this.customRequest<VaccineResponse[]>('with-route-administration', 'GET');
    }
}

export const vaccinesService = new VaccinesService();
