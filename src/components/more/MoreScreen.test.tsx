import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useGoBack } from '@/hooks/useGoBack'
import { MoreScreen } from './MoreScreen'

function SettingsStub() {
  return (
    <button type="button" onClick={useGoBack()}>
      Back
    </button>
  )
}

/** The More menu on '/', a settings screen with Back, and the Shows tab */
function renderApp(initialPath: string, onNavigate = vi.fn()) {
  const rootRoute = createRootRoute({ component: Outlet })
  const routeTree = rootRoute.addChildren([
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => <MoreScreen onSwitchController={() => {}} onNavigate={onNavigate} />,
    }),
    createRoute({
      getParentRoute: () => rootRoute,
      path: '/settings/sync',
      component: SettingsStub,
    }),
    createRoute({ getParentRoute: () => rootRoute, path: '/shows', component: () => 'Shows tab' }),
  ])
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  })
  render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return router
}

describe('MoreScreen', () => {
  it('links to each screen and tells the drawer to close', async () => {
    const onNavigate = vi.fn()
    const router = renderApp('/', onNavigate)
    expect(await screen.findByRole('link', { name: /Sleep Timer/ })).toHaveAttribute(
      'href',
      '/settings/timer',
    )
    expect(screen.getAllByRole('link')).toHaveLength(8)

    await userEvent.click(screen.getByRole('link', { name: /Sync/ }))
    expect(onNavigate).toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/settings/sync')

    // Back returns to the screen the link was followed from
    await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
    expect(await screen.findByRole('link', { name: /Sync/ })).toBeInTheDocument()
  })

  it('Back goes to the Shows tab when a screen was opened directly', async () => {
    renderApp('/settings/sync')
    await userEvent.click(await screen.findByRole('button', { name: 'Back' }))
    expect(await screen.findByText('Shows tab')).toBeInTheDocument()
  })

  it('switches the app theme', async () => {
    renderApp('/')
    const ocean = await screen.findByRole('button', { name: /Ocean/ })
    await userEvent.click(ocean)
    expect(ocean).toHaveAttribute('aria-pressed', 'true')
  })
})
