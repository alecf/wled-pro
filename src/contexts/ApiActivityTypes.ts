import { createContext } from 'react'

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'

export interface ApiActivityContextValue {
  saveStatus: SaveStatus
  /** Start a save operation - returns an ID to end it */
  startSave: () => string
  /** End a save operation with success */
  endSaveSuccess: (id: string) => void
  /** End a save operation with error */
  endSaveError: (id: string) => void
}

export const ApiActivityContext = createContext<ApiActivityContextValue | null>(null)
