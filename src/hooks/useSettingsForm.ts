import { useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ConfigPatch } from '@/types/wled'
import { useSetConfig, useWledFullConfig } from './useWled'

/** The parts of useConfigEdits a settings form needs */
interface SettingsSection {
  formData: object
  /** The edits themselves, so reset() can keep ones made while a save was in flight */
  edits: unknown
  isDirty: boolean
  reset: (saved?: unknown) => void
}

interface SettingsFormOptions<S extends Record<string, SettingsSection>> {
  /** The screen's edit state, one useConfigEdits per config section */
  sections: S
  /** Build the /json/cfg patch from the edited sections (sections without edits are undefined) */
  toPatch: (edited: { [K in keyof S]?: S[K]['formData'] }) => ConfigPatch
  /** Toast shown after a successful save */
  successMessage: string
  /** Called after a successful save, before the edits are cleared */
  onSaved?: () => void
}

/**
 * Save logic shared by the settings screens: all edited sections go to the device in one
 * /json/cfg POST, then the config is re-read and the edits cleared. A failed save keeps the
 * edits, so nothing is half-saved and a retry sends the same patch.
 *
 * `save` throws on failure (for RebootPrompt's Save & Reboot, which must not reboot then);
 * `handleSave` toasts the failure instead (for the Save button).
 */
export function useSettingsForm<S extends Record<string, SettingsSection>>(
  baseUrl: string,
  { sections, toPatch, successMessage, onSaved }: SettingsFormOptions<S>,
) {
  const setConfig = useSetConfig(baseUrl)
  const { refetch } = useWledFullConfig(baseUrl)
  const isDirty = Object.values(sections).some((section) => section.isDirty)
  // Covers the POST and the re-read, so Save can't be pressed again in between
  const [isSaving, setIsSaving] = useState(false)
  // The save in flight: a second call (e.g. Save & Reboot during a Save) waits for it
  const inFlightRef = useRef<Promise<void> | null>(null)

  const saveOnce = async () => {
    setIsSaving(true)
    const entries = Object.entries(sections)
    const edited = Object.fromEntries(
      entries
        .filter(([, section]) => section.isDirty)
        .map(([key, section]) => [key, section.formData]),
    ) as { [K in keyof S]?: S[K]['formData'] }
    if (Object.keys(edited).length > 0) {
      await setConfig.mutateAsync(toPatch(edited))
    }
    toast.success(successMessage)
    onSaved?.()
    // Re-read FIRST so the form shows the saved values, THEN clear the saved edits. Join the
    // refetch the mutation's invalidation started rather than cancelling it and fetching again.
    await refetch({ cancelRefetch: false })
    for (const [, section] of entries) section.reset(section.edits)
  }

  const save = () => {
    inFlightRef.current ??= saveOnce().finally(() => {
      inFlightRef.current = null
      setIsSaving(false)
    })
    return inFlightRef.current
  }

  const handleSave = () =>
    save().catch((error) => {
      toast.error('Failed to save settings')
      console.error(error)
    })

  return { isDirty, isSaving, save, handleSave }
}
