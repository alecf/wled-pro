import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { HomeScreen } from '@/components/HomeScreen'
import { useControllers } from '@/hooks/useControllers'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  const navigate = useNavigate()

  const { selectedUrl, selectController } = useControllers()

  // A controller is already selected: go straight to it
  useEffect(() => {
    if (selectedUrl) {
      navigate({ to: '/shows' })
    }
  }, [selectedUrl, navigate])

  // Don't show home screen if we're redirecting
  if (selectedUrl) {
    return null
  }

  return <HomeScreen onSelectController={selectController} />
}
