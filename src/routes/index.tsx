import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { HomeScreen } from '@/components/HomeScreen'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  const navigate = useNavigate()

  // Check if controller is selected in localStorage
  const lastControllerId = localStorage.getItem('wled-pro:lastController')

  useEffect(() => {
    // If controller is selected, redirect to /shows
    if (lastControllerId) {
      navigate({ to: '/shows' })
    }
  }, [lastControllerId, navigate])

  const handleSelectController = (controllerId: string) => {
    localStorage.setItem('wled-pro:lastController', controllerId)
    navigate({ to: '/shows' })
  }

  // Don't show home screen if we're redirecting
  if (lastControllerId) {
    return null
  }

  return <HomeScreen onSelectController={handleSelectController} />
}
