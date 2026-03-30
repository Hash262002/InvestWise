// Auth Types
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  preferences?: {
    currency: string
    theme: string
    notifications: boolean
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: string
}

export interface AuthResponse {
  message: string
  user: User
  tokens: AuthTokens
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
}
