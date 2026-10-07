import 'fake-indexeddb/auto'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { beforeEach, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { routes } from '../routes'
import { resetLocalDb } from '../services/localDb'

const USER = { id: 1, username: 'aidan', display_name: 'Aidan' }
const DOGS = [{ id: 3, name: 'Bailey', owner_name: 'Sam', notes: null, created_at: '' }]

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

/** Signed in, with a tiny in-memory walks API. */
function fakeServer() {
  const writes: string[] = []
  const walks = new Map<string, Record<string, unknown> & { events: { id: string }[] }>()
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (url === '/api/auth/me') return json(200, USER)
    if (url === '/api/dogs') return json(200, DOGS)
    if (method === 'GET' && url.startsWith('/api/walks?')) return json(200, [])
    if (method !== 'GET') writes.push(`${method} ${url}`)

    const [, id, action, eventId] = url.match(
      /^\/api\/walks(?:\/([^/]+))?(?:\/(\w+))?(?:\/(.+))?$/,
    )!
    if (method === 'POST' && !id) {
      walks.set(body.id, { ...body, dog: DOGS[0], status: 'created', events: [], notes: null })
      return json(201, {})
    }
    const walk = walks.get(id)
    if (!walk) return json(404, { detail: 'Not found' })
    if (method === 'GET') return json(200, walk)
    if (action === 'start') Object.assign(walk, { status: 'active', ...body })
    if (action === 'finish') Object.assign(walk, { status: 'completed', ...body })
    if (action === 'events' && method === 'POST') walk.events.push(body)
    if (action === 'events' && method === 'DELETE') {
      walk.events = walk.events.filter((e) => e.id !== eventId)
    }
    return json(204)
  })
  return writes
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const view = render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return { router, ...view }
}

beforeEach(async () => {
  await resetLocalDb()
  localStorage.clear()
})

it('starts a walk, logs events, survives a refresh, and finishes', async () => {
  const writes = fakeServer()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  const user = userEvent.setup()

  const first = renderAt('/walk/new')
  // The only dog is preselected.
  expect(await screen.findByRole('radio', { name: /Bailey/ })).toBeChecked()
  await user.click(screen.getByRole('radio', { name: /Record on another device/ }))
  await user.click(screen.getByRole('button', { name: 'Start walk' }))

  expect(await screen.findByRole('heading', { name: "Bailey's walk" })).toBeInTheDocument()
  expect(screen.getByText(/Upload the GPX after the walk/)).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Pee' }))
  await user.click(screen.getByRole('button', { name: 'Water' }))
  await screen.findByRole('button', { name: /Delete Water/ })
  const walkPath = first.router.state.location.pathname
  expect(walkPath).toMatch(/^\/walk\/[0-9a-f-]{36}\/live$/)

  // "Refresh": throw the whole UI away and open the same URL again.
  first.unmount()
  renderAt(walkPath)
  await screen.findByRole('button', { name: /Delete Water/ })
  await user.click(screen.getByRole('button', { name: /Delete Water/ }))
  await vi.waitFor(() =>
    expect(screen.queryByRole('button', { name: /Delete Water/ })).not.toBeInTheDocument(),
  )
  expect(screen.getByRole('button', { name: /Delete Pee/ })).toBeInTheDocument()

  await user.click(screen.getByRole('button', { name: 'Finish walk' }))
  const activity = (await screen.findByRole('heading', { name: 'Activity' })).parentElement!
  expect(within(activity).getByText('Pee')).toBeInTheDocument()
  expect(within(activity).queryByText('Water')).not.toBeInTheDocument()

  const id = walkPath.split('/')[2]
  await vi.waitFor(() => expect(writes).toContain(`POST /api/walks/${id}/finish`))
  expect(writes.slice(0, 2)).toEqual(['POST /api/walks', `POST /api/walks/${id}/start`])
})
