import { BaseService } from './base-service';

/**
 * Service for handling security-related operations.
 */
class SecurityService extends BaseService<any> {
  constructor() {
    super('security');
  }

  /**
   * Fetches recent security alerts.
   * @returns {Promise<any>} A promise that resolves to the security alerts.
   */
  async getAlerts(): Promise<any> {
    return this.customRequest('alerts', 'GET');
  }

  /**
   * Fetches security metrics. (Admin only)
   * @returns {Promise<any>} A promise that resolves to the security metrics.
   */
  async getMetrics(): Promise<any> {
    return this.customRequest('metrics', 'GET');
  }

  /**
   * Triggers a manual security scan of the system.
   * @returns {Promise<any>} A promise that resolves to the scan result.
   */
  async performScan(): Promise<any> {
    return this.customRequest('scan', 'POST');
  }
}

export const securityService = new SecurityService();
