import { createFileRoute } from '@tanstack/react-router'
import { SecurityScreen } from '@/components/security/SecurityScreen'
import { useGoBack } from '@/hooks/useGoBack'

export const Route = createFileRoute('/_controller/_page/settings/security')({
  component: SecurityRoute,
})

function SecurityRoute() {
  return <SecurityScreen onBack={useGoBack()} />
}
