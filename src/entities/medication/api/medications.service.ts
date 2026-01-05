import { BaseService } from '@/shared/api/base-service';
import type { MedicationInput, PaginatedResponse, MedicationResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the medications API.
 * @extends {BaseService<MedicationResponse>}
 */
export class MedicationsService extends BaseService<MedicationResponse> {
  /**
   * Creates an instance of MedicationsService.
   */
  constructor() {
    super('medications');
  }

  /**
   * Retrieves a paginated list of medications.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<MedicationResponse>>} A promise that resolves to the paginated list of medications.
   */
  public async getMedications(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<MedicationResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single medication by its ID.
   * @param {string} id - The ID of the medication to retrieve.
   * @returns {Promise<MedicationResponse>} A promise that resolves to the requested medication.
   */
  public async getMedicationById(id: string): Promise<MedicationResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new medication.
   * @param {MedicationInput} medicationData - The data for the new medication.
   * @returns {Promise<MedicationResponse>} A promise that resolves to the created medication.
   */
  public async createMedication(medicationData: MedicationInput): Promise<MedicationResponse> {
    return this.create(medicationData);
  }

  /**
   * Updates an existing medication.
   * @param {string} id - The ID of the medication to update.
   * @param {Partial<MedicationInput>} medicationData - The data to update the medication with.
   * @returns {Promise<MedicationResponse>} A promise that resolves to the updated medication.
   */
  public async updateMedication(id: string, medicationData: Partial<MedicationInput>): Promise<MedicationResponse> {
    return this.update(id, medicationData);
  }

  /**
   * Partially updates an existing medication.
   * @param {string} id - The ID of the medication to update.
   * @param {Partial<MedicationInput>} medicationData - The data to update the medication with.
   * @returns {Promise<MedicationResponse>} A promise that resolves to the updated medication.
   */
  public async patchMedication(id: string, medicationData: Partial<MedicationInput>): Promise<MedicationResponse> {
    return this.patch(id, medicationData);
  }

  /**
   * Deletes a medication by its ID.
   * @param {string} id - The ID of the medication to delete.
   * @returns {Promise<boolean>} A promise that resolves when the medication is deleted.
   */
  public async deleteMedication(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple medications in a single request.
   * @param {MedicationInput[]} data - An array of medication data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: MedicationInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the medications.
   * @returns {Promise<any>} A promise that resolves to the medication statistics.
   */
  public async getMedicationsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }

    /**
   * Retrieves medications by route ID.
   * @param {string} routeId - The ID of the route.
   * @returns {Promise<MedicationResponse[]>} A promise that resolves to a list of medications.
   */
    public async getMedicationsByRoute(routeId: string): Promise<MedicationResponse[]> {
        return this.customRequest<MedicationResponse[]>(`by-route/${routeId}`, 'GET');
    }

    /**
     * Retrieves all medications with their route administration information.
     * @returns {Promise<MedicationResponse[]>} A promise that resolves to a list of medications with route administration.
     */
    public async getMedicationsWithRouteAdministration(): Promise<MedicationResponse[]> {
        return this.customRequest<MedicationResponse[]>('with-route-administration', 'GET');
    }
}

export const medicationsService = new MedicationsService();
