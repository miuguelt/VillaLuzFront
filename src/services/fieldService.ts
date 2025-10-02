import { BaseService } from './baseService';
import type { FieldInput, PaginatedResponse, FieldResponse } from '@/types/swaggerTypes';

/**
 * Service class for interacting with the fields API.
 * @extends {BaseService<Field>}
 */
export class FieldService extends BaseService<FieldResponse> {
  /**
   * Creates an instance of FieldService.
   */
  constructor() {
    super('fields');
  }

  /**
   * Retrieves a paginated list of fields.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<FieldResponse>>} A promise that resolves to the paginated list of fields.
   */
  public async getFields(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<FieldResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single field by its ID.
   * @param {string} id - The ID of the field to retrieve.
   * @returns {Promise<FieldResponse>} A promise that resolves to the requested field.
   */
  public async getFieldById(id: string): Promise<FieldResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new field.
   * @param {Omit<Field, 'id'>} fieldData - The data for the new field.
   * @returns {Promise<FieldResponse>} A promise that resolves to the created field.
   */
  public async createField(fieldData: FieldInput): Promise<FieldResponse> {
    return this.create(fieldData);
  }

  /**
   * Updates an existing field.
   * @param {string} id - The ID of the field to update.
   * @param {Partial<Field>} fieldData - The data to update the field with.
   * @returns {Promise<FieldResponse>} A promise that resolves to the updated field.
   */
  public async updateField(id: string, fieldData: Partial<FieldInput>): Promise<FieldResponse> {
    return this.update(id, fieldData);
  }

  /**
   * Partially updates an existing field.
   * @param {string} id - The ID of the field to update.
   * @param {Partial<FieldInput>} fieldData - The data to update the field with.
   * @returns {Promise<FieldResponse>} A promise that resolves to the updated field.
   */
  public async patchField(id: string, fieldData: Partial<FieldInput>): Promise<FieldResponse> {
    return this.patch(id, fieldData);
  }

  /**
   * Deletes a field by its ID.
   * @param {string} id - The ID of the field to delete.
   * @returns {Promise<boolean>} A promise that resolves when the field is deleted.
   */
  public async deleteField(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple fields in a single request.
   * @param {FieldInput[]} data - An array of field data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: FieldInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the fields.
   * @returns {Promise<any>} A promise that resolves to the field statistics.
   */
  public async getFieldsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const fieldService = new FieldService();

