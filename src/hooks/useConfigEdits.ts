import { useState } from 'react'

/**
 * Local edits layered over a server config object, for settings screens.
 *
 * `formData` is the server value with edits shallow-merged on top. `setNested` updates one key
 * of a nested object (e.g. `recv.bri`) without losing its other server values. Call `reset()`
 * after saving (and refetching) to drop the edits and show server data again.
 */
export function useConfigEdits<T extends object>(server: T | undefined) {
  const [edits, setEdits] = useState<Partial<T> | null>(null)

  const formData: Partial<T> = { ...server, ...edits }

  const setField = <K extends keyof T>(key: K, value: T[K]) => {
    setEdits((prev) => ({ ...prev, [key]: value }) as Partial<T>)
  }

  const setNested = <K extends keyof T, S extends keyof NonNullable<T[K]>>(
    key: K,
    subKey: S,
    value: NonNullable<T[K]>[S],
  ) => {
    setEdits(
      (prev) =>
        ({
          ...prev,
          [key]: { ...server?.[key], ...prev?.[key], [subKey]: value },
        }) as Partial<T>,
    )
  }

  return {
    formData,
    setField,
    setNested,
    isDirty: edits !== null,
    reset: () => setEdits(null),
  }
}
