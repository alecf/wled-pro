import { useState, useCallback, useRef, useEffect, type ReactNode } from 'react'
import { ApiActivityContext, type SaveStatus } from './ApiActivityTypes'

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
