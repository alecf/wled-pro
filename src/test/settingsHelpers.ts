import { screen, within } from '@testing-library/react'
import type { useFakeWled } from './fake-wled/adapters/vitest'

/** JSON bodies of the POST /json/cfg requests the fake device received */
export function configPosts(device: ReturnType<typeof useFakeWled>) {
  return device.sim.requests
    .filter((r) => r.method === 'POST' && r.path === '/json/cfg' && !r.failed)
    .map((r) => r.json as Record<string, unknown>)
}

/** The control (switch, input, ...) of the settings row titled `title` */
export function rowControl(title: string, role: 'switch' | 'spinbutton' | 'textbox' = 'switch') {
  let el: HTMLElement | null = screen.getByText(title)
  while (el && within(el).queryAllByRole(role).length === 0) el = el.parentElement
  if (!el) throw new Error(`No ${role} next to "${title}"`)
  return within(el).getAllByRole(role)[0]
}
