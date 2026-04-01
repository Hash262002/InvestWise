// UI Store - UI state (modals, toasts, etc)
import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
}

interface UIState {
  modals: {
    createPortfolio: boolean
    editPortfolio: boolean
    deletePortfolio: boolean
    addHolding: boolean
  }
  toasts: Toast[]
  theme: 'light' | 'dark'

  openModal: (name: keyof UIState['modals']) => void
  closeModal: (name: keyof UIState['modals']) => void
  toggleModal: (name: keyof UIState['modals']) => void
  
  // Convenience getters for specific modals
  isCreatePortfolioModalOpen: boolean
  toggleCreatePortfolioModal: () => void
  isEditPortfolioModalOpen: boolean
  toggleEditPortfolioModal: () => void
  isDeletePortfolioModalOpen: boolean
  toggleDeletePortfolioModal: () => void
  isAddHoldingModalOpen: boolean
  toggleAddHoldingModal: () => void
  
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
  toggleTheme: () => void
}

export const useUIStore = create<UIState>((set, get) => ({
  modals: {
    createPortfolio: false,
    editPortfolio: false,
    deletePortfolio: false,
    addHolding: false,
  },
  toasts: [],
  theme: localStorage.getItem('theme') === 'dark' ? 'dark' : 'light',

  openModal: (name: keyof UIState['modals']) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [name]: true,
      },
    }))
  },

  closeModal: (name: keyof UIState['modals']) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [name]: false,
      },
    }))
  },

  toggleModal: (name: keyof UIState['modals']) => {
    set((state) => ({
      modals: {
        ...state.modals,
        [name]: !state.modals[name],
      },
    }))
  },

  // Convenience getters for specific modals
  isCreatePortfolioModalOpen: false,
  toggleCreatePortfolioModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        createPortfolio: !state.modals.createPortfolio,
      },
    }))
  },

  isEditPortfolioModalOpen: false,
  toggleEditPortfolioModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        editPortfolio: !state.modals.editPortfolio,
      },
    }))
  },

  isDeletePortfolioModalOpen: false,
  toggleDeletePortfolioModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        deletePortfolio: !state.modals.deletePortfolio,
      },
    }))
  },

  isAddHoldingModalOpen: false,
  toggleAddHoldingModal: () => {
    set((state) => ({
      modals: {
        ...state.modals,
        addHolding: !state.modals.addHolding,
      },
    }))
  },

  addToast: (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { ...toast, id }

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }))

    // Auto-remove after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }))
      }, toast.duration || 5000)
    }
  },

  removeToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }))
  },

  toggleTheme: () => {
    set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light'
      localStorage.setItem('theme', newTheme)
      return { theme: newTheme }
    })
  },
}))
