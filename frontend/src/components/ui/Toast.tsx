import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { Toast as ToastType } from '@/types/api'

interface ToastProps {
  toast: ToastType & { id: string }
}

export const Toast = ({ toast }: ToastProps) => {
  const { removeToast } = useUIStore()

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 5000)
    return () => clearTimeout(timer)
  }, [toast.id, removeToast])

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  }[toast.type]

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    warning: 'text-yellow-800',
    info: 'text-blue-800',
  }[toast.type]

  const iconColor = {
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
    info: 'text-blue-500',
  }[toast.type]

  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  }[toast.type]

  return (
    <div className={`p-4 rounded-lg border ${bgColor} flex items-start gap-3 animate-slide-in`}>
      <span className={`text-lg font-bold ${iconColor} flex-shrink-0`}>{icon}</span>
      <p className={`text-sm font-medium ${textColor} flex-1`}>{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className={`text-xl font-bold ${textColor} hover:opacity-70`}
      >
        ×
      </button>
    </div>
  )
}
