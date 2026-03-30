// API Response Types
export interface ApiResponse<T> {
  message?: string
  data?: T
  error?: string
  statusCode?: number
  timestamp?: string
}

export interface ApiError {
  error: string
  message: string
  statusCode: number
  timestamp?: string
}

export interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
}

// Toast Types
export interface Toast {
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
}
