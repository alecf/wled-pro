import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ControllerHeader } from '@/components/navigation/ControllerHeader'

/** Full-screen controller pages (settings, the light show editor): the header, then the page */
export const Route = createFileRoute('/_controller/_page')({
  component: PageLayout,
})

function PageLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ControllerHeader />
      <Outlet />
    </div>
  )
}
