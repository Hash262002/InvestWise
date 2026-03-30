// Utility functions for formatting
export const formatCurrency = (value: number, currency = 'INR') => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return formatter.format(value)
}

export const formatPercentage = (value: number, decimal = 2) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimal)}%`
}

export const formatNumber = (value: number, decimal = 2) => {
  return value.toFixed(decimal)
}

export const formatDate = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const formatTime = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export const formatDatetime = (date: string | Date) => {
  return `${formatDate(date)} ${formatTime(date)}`
}

export const getReturnColor = (value: number) => {
  if (value > 0) return 'text-green-600'
  if (value < 0) return 'text-red-600'
  return 'text-gray-600'
}

export const getReturnBgColor = (value: number) => {
  if (value > 0) return 'bg-green-50'
  if (value < 0) return 'bg-red-50'
  return 'bg-gray-50'
}
