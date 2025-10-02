import { BaseService } from './baseService';
import type { RouteAdministrationInput, PaginatedResponse, RouteAdministrationResponse } from '@/types/swaggerTypes';

/**
 * Service class for interacting with the route administrations API.
 * @extends {BaseService<RouteAdministrationResponse>}
 */
export class RouteAdministrationsService extends BaseService<RouteAdministrationResponse> {
  /**
   * Creates an instance of RouteAdministrationsService.
   */
  constructor() {
    super('route-administrations');
  }

  /**
   * Retrieves a paginated list of route administrations.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<RouteAdministrationResponse>>} A promise that resolves to the paginated list of route administrations.
   */
  public async getRouteAdministrations(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<RouteAdministrationResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single route administration by its ID.
   * @param {string} id - The ID of the route administration to retrieve.
   * @returns {Promise<RouteAdministrationResponse>} A promise that resolves to the requested route administration.
   */
  public async getRouteAdministrationById(id: string): Promise<RouteAdministrationResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new route administration.
   * @param {RouteAdministrationInput} routeAdministrationData - The data for the new route administration.
   * @returns {Promise<RouteAdministrationResponse>} A promise that resolves to the created route administration.
   */
  public async createRouteAdministration(routeAdministrationData: RouteAdministrationInput): Promise<RouteAdministrationResponse> {
    return this.create(routeAdministrationData);
  }

  /**
   * Updates an existing route administration.
   * @param {string} id - The ID of the route administration to update.
   * @param {Partial<RouteAdministrationInput>} routeAdministrationData - The data to update the route administration with.
   * @returns {Promise<RouteAdministrationResponse>} A promise that resolves to the updated route administration.
   */
  public async updateRouteAdministration(id: string, routeAdministrationData: Partial<RouteAdministrationInput>): Promise<RouteAdministrationResponse> {
    return this.update(id, routeAdministrationData);
  }

  /**
   * Partially updates an existing route administration.
   * @param {string} id - The ID of the route administration to update.
   * @param {Partial<RouteAdministrationInput>} routeAdministrationData - The data to update the route administration with.
   * @returns {Promise<RouteAdministrationResponse>} A promise that resolves to the updated route administration.
   */
  public async patchRouteAdministration(id: string, routeAdministrationData: Partial<RouteAdministrationInput>): Promise<RouteAdministrationResponse> {
    return this.patch(id, routeAdministrationData);
  }

  /**
   * Deletes a route administration by its ID.
   * @param {string} id - The ID of the route administration to delete.
   * @returns {Promise<boolean>} A promise that resolves when the route administration is deleted.
   */
  public async deleteRouteAdministration(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple route administrations in a single request.
   * @param {RouteAdministrationInput[]} data - An array of route administration data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: RouteAdministrationInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the route administrations.
   * routes.json confirma disponibilidad de /route-administrations/stats
   * @returns {Promise<any>} A promise that resolves to the route administration statistics.
   */
  public async getRouteAdministrationsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }

  /**
   * Retrieves all active route administrations.
   * @returns {Promise<RouteAdministrationResponse[]>} A promise that resolves to a list of active route administrations.
   */
  public async getActiveRouteAdministrations(): Promise<RouteAdministrationResponse[]> {
    return this.customRequest<RouteAdministrationResponse[]>('active', 'GET');
  }

  /**
   * Searches for route administrations by name or description.
   * routes.json confirma disponibilidad de /route-administrations/search
   * @param {string} query - The search query.
   * @returns {Promise<RouteAdministrationResponse[]>} A promise that resolves to a list of matching route administrations.
   */
  public async searchRouteAdministrations(query: string): Promise<RouteAdministrationResponse[]> {
    return this.search(query);
  }
}

export const routeAdministrationsService = new RouteAdministrationsService();
