export interface Alerts {
  // Define properties for Alerts based on backend response
  [key: string]: any;
}

export interface AnimalStats {
  by_status: any;
  by_sex: any;
  by_breed: any[];
  by_age_group: any;
  weight_distribution: any;
  total_animals: number;
  average_weight: number;
}

export interface MedicalHistory {
  // Define properties for MedicalHistory based on backend response
  [key: string]: any;
}

export interface DashboardStats {
  total_animals: number;
  active_animals: number;
  health_alerts: number;
  productivity_score: number;
  recent_activities: any[];
  generated_at: string;
}

export interface HealthStats {
  treatments_by_month: any[];
  vaccinations_by_month: any[];
  health_status_distribution: any;
  common_diseases: any[];
  medication_usage: any[];
  summary: any;
}

export interface ProductionStats {
  weight_trends: any[];
  growth_rates: any[];
  productivity_metrics: any;
  best_performers: any[];
  group_statistics: any;
  summary: any;
}

export interface CustomReport {
  // Define properties for CustomReport based on backend response
  [key: string]: any;
}

export interface CustomReportPayload {
  report_type: 'health' | 'productivity' | 'inventory' | 'activities';
  treatment_date: string;
  end_date: string;
  animal_ids?: number[];
  breed_ids?: number[];
  format?: 'json' | 'summary';
  group_by?: 'breed' | 'sex' | 'age_group' | 'month';
}
