/**
 * Analytics Feature Flags
 *
 * Controls which analytics endpoints are enabled in the frontend.
 * Set to `false` for endpoints that don't exist in the backend yet.
 *
 * Backend Analytics Endpoints Status:
 * ✅ AVAILABLE:
 *    - GET /api/v1/analytics/dashboard
 *    - GET /api/v1/analytics/dashboard/complete (with 2min cache)
 *    - GET /api/v1/analytics/alerts
 *    - POST /api/v1/analytics/reports/custom
 *    - GET /api/v1/analytics/animals/{id}/medical-history
 *    - GET /api/v1/analytics/production/statistics
 *    - GET /api/v1/analytics/animals/statistics
 *    - GET /api/v1/analytics/health/statistics
 *
 * ❌ NOT IMPLEMENTED (disabled below):
 *    - GET /api/v1/analytics/animals/trends
 *    - GET /api/v1/analytics/fields/occupation
 *    - GET /api/v1/analytics/animals/inventory
 *    - GET /api/v1/analytics/animals/age-pyramid
 *    - GET /api/v1/analytics/animals/reproductive-efficiency
 *    - GET /api/v1/analytics/health/summary
 *    - GET /api/v1/analytics/health/diseases
 *    - GET /api/v1/analytics/health/vaccination-coverage
 *    - GET /api/v1/analytics/fields/health-map
 *    - GET /api/v1/analytics/charts/animal-distribution
 *    - GET /api/v1/analytics/charts/health-heatmap
 */

export const ANALYTICS_FEATURES = {
  // ✅ Core endpoints (available in backend)
  DASHBOARD_BASIC: true,              // GET /analytics/dashboard
  DASHBOARD_COMPLETE: true,           // GET /analytics/dashboard/complete
  ALERTS: true,                       // GET /analytics/alerts
  CUSTOM_REPORTS: true,               // POST /analytics/reports/custom
  ANIMAL_MEDICAL_HISTORY: true,       // GET /analytics/animals/{id}/medical-history
  PRODUCTION_STATISTICS: true,        // GET /analytics/production/statistics
  ANIMAL_STATISTICS: true,            // GET /analytics/animals/statistics
  HEALTH_STATISTICS: true,            // GET /analytics/health/statistics

  // ❌ Not implemented in backend yet (disabled)
  ANIMAL_TRENDS: false,               // GET /analytics/animals/trends
  FIELD_OCCUPATION: false,            // GET /analytics/fields/occupation
  ANIMAL_INVENTORY: false,            // GET /analytics/animals/inventory
  AGE_PYRAMID: false,                 // GET /analytics/animals/age-pyramid
  REPRODUCTIVE_EFFICIENCY: false,     // GET /analytics/animals/reproductive-efficiency
  HEALTH_SUMMARY: false,              // GET /analytics/health/summary
  DISEASE_STATISTICS: false,          // GET /analytics/health/diseases
  VACCINATION_COVERAGE: false,        // GET /analytics/health/vaccination-coverage
  FIELD_HEALTH_MAP: false,            // GET /analytics/fields/health-map
  ANIMAL_DISTRIBUTION: false,         // GET /analytics/charts/animal-distribution
  HEALTH_HEATMAP: false,              // GET /analytics/charts/health-heatmap
} as const;

/**
 * Helper function to check if an analytics feature is enabled
 */
export const isAnalyticsFeatureEnabled = (feature: keyof typeof ANALYTICS_FEATURES): boolean => {
  return ANALYTICS_FEATURES[feature] === true;
};

/**
 * Get list of all enabled analytics features
 */
export const getEnabledAnalyticsFeatures = (): Array<keyof typeof ANALYTICS_FEATURES> => {
  return Object.entries(ANALYTICS_FEATURES)
    .filter(([_, enabled]) => enabled)
    .map(([feature, _]) => feature as keyof typeof ANALYTICS_FEATURES);
};

/**
 * Get list of all disabled analytics features
 */
export const getDisabledAnalyticsFeatures = (): Array<keyof typeof ANALYTICS_FEATURES> => {
  return Object.entries(ANALYTICS_FEATURES)
    .filter(([_, enabled]) => !enabled)
    .map(([feature, _]) => feature as keyof typeof ANALYTICS_FEATURES);
};
