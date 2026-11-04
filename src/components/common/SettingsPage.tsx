import { LoadingScreen } from '@/components/common/LoadingScreen'
import { PageHeader } from '@/components/common/PageHeader'
import { Button } from '@/components/ui/button'

interface SettingsPageProps {
  title: string
  onBack: () => void
  /** Shows a loading spinner instead of the content */
  isLoading?: boolean
  /** Shows the Save button in the header */
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
  children?: React.ReactNode
}

/**
 * Layout for a settings screen rendered under the ControllerHeader: a sticky PageHeader with
 * back button and (when there are unsaved edits) a Save button, then padded content.
 */
export function SettingsPage({
  title,
  onBack,
  isLoading,
  isDirty,
  isSaving,
  onSave,
  children,
}: SettingsPageProps) {
  return (
    <>
      <PageHeader
        title={title}
        onBack={onBack}
        belowAppHeader
        actions={
          isDirty &&
          onSave && (
            <Button onClick={onSave} size="sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          )
        }
      />
      {isLoading ? <LoadingScreen /> : <div className="p-4 space-y-6">{children}</div>}
    </>
  )
}
