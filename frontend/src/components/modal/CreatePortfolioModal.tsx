import { useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { usePortfolio } from '@/hooks/usePortfolio'
import { validatePortfolioName } from '@/utils/validators'
import { PORTFOLIO_TYPES } from '@/utils/constants'

export const CreatePortfolioModal = () => {
  const isCreatePortfolioModalOpen = useUIStore((state) => state.modals.createPortfolio)
  const toggleCreatePortfolioModal = useUIStore((state) => state.toggleCreatePortfolioModal)
  const { createPortfolio, loading } = usePortfolio()

  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    description: '',
  })
  const [errors, setErrors] = useState<{ name?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: typeof errors = {}
    if (!validatePortfolioName(formData.name)) {
      newErrors.name = 'Portfolio name is required (1-100 characters)'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await createPortfolio(formData)
      setFormData({ name: '', type: 'other', description: '' })
      toggleCreatePortfolioModal()
    } catch (error) {
      console.error('Failed to create portfolio:', error)
    }
  }

  if (!isCreatePortfolioModalOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Portfolio</h2>
          <button
            onClick={() => toggleCreatePortfolioModal()}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Portfolio Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value })
                if (errors.name) setErrors({})
              }}
              className={`form-input ${errors.name ? 'border-red-500' : ''}`}
              placeholder="e.g., My Aggressive Portfolio"
              disabled={loading}
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Portfolio Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Portfolio Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="form-input"
              disabled={loading}
            >
              {PORTFOLIO_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input h-24 resize-none"
              placeholder="Add notes about this portfolio"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => toggleCreatePortfolioModal()}
              className="btn btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary flex-1"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
