import { BaseService } from '@/shared/api/base-service';
import type { ControlInput, PaginatedResponse, ControlResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the controls API.
 * @extends {BaseService<Control>}
 */
export class ControlService extends BaseService<ControlResponse> {
  /**
   * Creates an instance of ControlService.
   */
  constructor() {
    super('controls');
  }

  /**
   * Retrieves a paginated list of controls.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<ControlResponse>>} A promise that resolves to the paginated list of controls.
   */
  public async getControls(options: { page?: number; limit?: number } = {}): Promise<PaginatedResponse<ControlResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single control by its ID.
   * @param {string} id - The ID of the control to retrieve.
   * @returns {Promise<ControlResponse>} A promise that resolves to the requested control.
   */
  public async getControlById(id: string): Promise<ControlResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new control.
   * @param {Omit<Control, 'id'>} controlData - The data for the new control.
   * @returns {Promise<ControlResponse>} A promise that resolves to the created control.
   */
  public async createControl(controlData: ControlInput): Promise<ControlResponse> {
    return this.create(controlData);
  }

  /**
   * Updates an existing control.
   * @param {string} id - The ID of the control to update.
   * @param {Partial<Control>} controlData - The data to update the control with.
   * @returns {Promise<ControlResponse>} A promise that resolves to the updated control.
   */
  public async updateControl(id: string, controlData: Partial<ControlInput>): Promise<ControlResponse> {
    return this.update(id, controlData);
  }

  /**
   * Partially updates an existing control.
   * @param {string} id - The ID of the control to update.
   * @param {Partial<ControlInput>} controlData - The data to update the control with.
   * @returns {Promise<ControlResponse>} A promise that resolves to the updated control.
   */
  public async patchControl(id: string, controlData: Partial<ControlInput>): Promise<ControlResponse> {
    return this.patch(id, controlData);
  }

  /**
   * Deletes a control by its ID.
   * @param {string} id - The ID of the control to delete.
   * @returns {Promise<boolean>} A promise that resolves when the control is deleted.
   */
  public async deleteControl(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple controls in a single request.
   * @param {ControlInput[]} data - An array of control data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: ControlInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the controls.
   * @returns {Promise<any>} A promise that resolves to the control statistics.
   */
  public async getControlsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const controlService = new ControlService();
