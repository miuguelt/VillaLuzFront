export interface FoodTypes {
    id?: number;
    food_type: string;
    sowing_date?: string;
    harvest_date?: string;
    area?: number;
    handlings?: string;
    gauges?: string;
    description?: string; // alias de handlings
    name?: string; // alias de food_type
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }