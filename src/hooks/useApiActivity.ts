import { useContext, useCallback } from 'react'
import { ApiActivityContext } from '@/contexts/ApiActivityTypes'

export function useApiActivity() {
  const context = useContext(ApiActivityContext)
  if (!context) {
    throw new Error('useApiActivity must be used within ApiActivityProvider')
  }
  return context
}

/**
 * Hook for components that perform save operations.
 * Returns a wrapper function that handles the save lifecycle.
 */
export function useSaveOperation() {
  const { startSave, endSaveSuccess, endSaveError } = useApiActivity()

  const wrapSave = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      const id = startSave()
      try {
        const result = await operation()
        endSaveSuccess(id)
        return result
      } catch (error) {
        endSaveError(id)
        throw error
      }
    },
    [startSave, endSaveSuccess, endSaveError]
  )

  return { wrapSave }
}
