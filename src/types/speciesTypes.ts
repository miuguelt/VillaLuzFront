export interface Species{
    id?: number;
    name: string;
}

export interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T;
  }