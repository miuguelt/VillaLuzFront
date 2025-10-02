import { BaseService } from './baseService';
import type { TreatmentMedicationInput, PaginatedResponse, TreatmentMedicationResponse } from '@/types/swaggerTypes';

/**
 * Service class for interacting with the treatment medications API.
 * @extends {BaseService<TreatmentMedicationResponse>}
 */
export class TreatmentMedicationsService extends BaseService<TreatmentMedicationResponse> {
  /**
   * Creates an instance of TreatmentMedicationsService.
   */
  constructor() {
    super('treatment-medications');
  }

  /**
   * Retrieves a paginated list of treatment medications.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<TreatmentMedicationResponse>>} A promise that resolves to the paginated list of treatment medications.
   */
  public async getTreatmentMedications(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<TreatmentMedicationResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single treatment medication by its ID.
   * @param {string} id - The ID of the treatment medication to retrieve.
   * @returns {Promise<TreatmentMedicationResponse>} A promise that resolves to the requested treatment medication.
   */
  public async getTreatmentMedicationById(id: string): Promise<TreatmentMedicationResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new treatment medication.
   * @param {TreatmentMedicationInput} treatmentMedicationData - The data for the new treatment medication.
   * @returns {Promise<TreatmentMedicationResponse>} A promise that resolves to the created treatment medication.
   */
  public async createTreatmentMedication(treatmentMedicationData: TreatmentMedicationInput): Promise<TreatmentMedicationResponse> {
    return this.create(treatmentMedicationData);
  }

  /**
   * Updates an existing treatment medication.
   * @param {string} id - The ID of the treatment medication to update.
   * @param {Partial<TreatmentMedicationInput>} treatmentMedicationData - The data to update the treatment medication with.
   * @returns {Promise<TreatmentMedicationResponse>} A promise that resolves to the updated treatment medication.
   */
  public async updateTreatmentMedication(id: string, treatmentMedicationData: Partial<TreatmentMedicationInput>): Promise<TreatmentMedicationResponse> {
    return this.update(id, treatmentMedicationData);
  }

  /**
   * Partially updates an existing treatment medication.
   * @param {string} id - The ID of the treatment medication to update.
   * @param {Partial<TreatmentMedicationInput>} treatmentMedicationData - The data to update the treatment medication with.
   * @returns {Promise<TreatmentMedicationResponse>} A promise that resolves to the updated treatment medication.
   */
  public async patchTreatmentMedication(id: string, treatmentMedicationData: Partial<TreatmentMedicationInput>): Promise<TreatmentMedicationResponse> {
    return this.patch(id, treatmentMedicationData);
  }

  /**
   * Deletes a treatment medication by its ID.
   * @param {string} id - The ID of the treatment medication to delete.
   * @returns {Promise<boolean>} A promise that resolves when the treatment medication is deleted.
   */
  public async deleteTreatmentMedication(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple treatment medications in a single request.
   * @param {TreatmentMedicationInput[]} data - An array of treatment medication data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: TreatmentMedicationInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the treatment medications.
   * @returns {Promise<any>} A promise that resolves to the treatment medication statistics.
   */
  public async getTreatmentMedicationsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const treatmentMedicationService = new TreatmentMedicationsService();

