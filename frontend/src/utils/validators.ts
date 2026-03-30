// Validation functions
export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export const validateName = (name: string): boolean => {
  return name.trim().length >= 2
}

export const validatePortfolioName = (name: string): boolean => {
  return name.trim().length >= 1 && name.trim().length <= 100
}

export const validateQuantity = (quantity: number): boolean => {
  return quantity > 0
}

export const validatePrice = (price: number): boolean => {
  return price >= 0
}
