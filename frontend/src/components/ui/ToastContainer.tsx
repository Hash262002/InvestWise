import { useUIStore } from '@/stores/uiStore'
import { Toast } from './Toast'

export const ToastContainer = () => {
  const { toasts } = useUIStore()

  return (
    <div className="fixed bottom-4 right-4 space-y-3 z-50 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
