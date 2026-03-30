// Helper functions
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max)
}

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCall = 0
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()

    if (now - lastCall >= delay) {
      fn(...args)
      lastCall = now
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => fn(...args), delay - (now - lastCall))
    }
  }
}

export const calculatePortfolioMetrics = (holdings: any[]) => {
  const totalInvested = holdings.reduce((sum, h) => sum + h.totalCost, 0)
  const currentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0)
  const totalReturn = currentValue - totalInvested
  const returnPercentage = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  return {
    totalInvested,
    currentValue,
    totalReturn,
    returnPercentage,
  }
}

export const calculateRiskLevel = (diversificationScore: number): string => {
  if (diversificationScore >= 70) return 'LOW'
  if (diversificationScore >= 50) return 'MEDIUM'
  if (diversificationScore >= 30) return 'HIGH'
  return 'VERY_HIGH'
}
