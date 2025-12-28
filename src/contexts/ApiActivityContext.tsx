import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react'

type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

interface ApiActivityContextValue {
  saveStatus: SaveStatus
  /** Start a save operation - returns an ID to end it */
  startSave: () => string
  /** End a save operation with success */
  endSaveSuccess: (id: string) => void
  /** End a save operation with error */
  endSaveError: (id: string) => void
}

const ApiActivityContext = createContext<ApiActivityContextValue | null>(null)

export function ApiActivityProvider({ children }: { children: ReactNode }) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const activeOperationsRef = useRef(new Set<string>())
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any success/error timeout when status changes to saving
  const clearTimeouts = useCallback(() => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current)
      successTimeoutRef.current = null
    }
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = null
    }
  }, [])

  const startSave = useCallback(() => {
    const id = crypto.randomUUID()
    activeOperationsRef.current.add(id)
    clearTimeouts()
    setSaveStatus('saving')
    return id
  }, [clearTimeouts])

  const endSaveSuccess = useCallback((id: string) => {
    activeOperationsRef.current.delete(id)

    // Only show success if no more operations pending
    if (activeOperationsRef.current.size === 0) {
      setSaveStatus('success')
      // Return to idle after 1 second
      successTimeoutRef.current = setTimeout(() => {
        setSaveStatus('idle')
      }, 1000)
    }
  }, [])

  const endSaveError = useCallback((id: string) => {
    activeOperationsRef.current.delete(id)

    // Show error even if other operations are pending
    setSaveStatus('error')
    // Return to idle (or saving if more ops pending) after 1 second
    errorTimeoutRef.current = setTimeout(() => {
      if (activeOperationsRef.current.size > 0) {
        setSaveStatus('saving')
      } else {
        setSaveStatus('idle')
      }
    }, 1000)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts()
    }
  }, [clearTimeouts])

  return (
    <ApiActivityContext.Provider
      value={{ saveStatus, startSave, endSaveSuccess, endSaveError }}
    >
      {children}
    </ApiActivityContext.Provider>
  )
}

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
