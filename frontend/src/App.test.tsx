import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './auth/AuthProvider'
import { routes } from './routes'

const USER = { id: 1, username: 'aidan', display_name: 'Aidan' }

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

/** Fake backend: one user, password "secret-password". */
function fakeServer(signedIn = false) {
  let session = signedIn
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    if (url === '/api/auth/me') return session ? json(200, USER) : json(401, { detail: 'x' })
    if (url === '/api/auth/login') {
      const { password } = JSON.parse(String(init?.body))
      if (password !== 'secret-password') {
        return json(401, { detail: 'Incorrect username or password' })
      }
      session = true
      return json(200, USER)
    }
    if (url === '/api/auth/logout') {
      session = false
      return json(204)
    }
    return json(404, { detail: 'Not found' })
  })
}

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return router
}

describe('auth flow', () => {
  it('redirects signed-out users to login, then back after signing in', async () => {
    fakeServer()
    const router = renderAt('/dogs')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Username'), 'aidan')
    await user.type(screen.getByLabelText('Password'), 'secret-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { name: 'Dogs' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dogs')
  })

  it('shows the server error on a bad password', async () => {
    fakeServer()
    renderAt('/login')
    const user = userEvent.setup()

    await user.type(await screen.findByLabelText('Username'), 'aidan')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password')
  })

  it('shows the dashboard to a signed-in user and signs out', async () => {
    fakeServer(true)
    const router = renderAt('/')
    const user = userEvent.setup()

    expect(await screen.findByRole('heading', { name: /Aidan/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /New walk/ })).toHaveAttribute('href', '/walk/new')

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByLabelText('Username')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('serves public share routes without login', async () => {
    fakeServer()
    renderAt('/w/someToken')
    expect(await screen.findByRole('heading', { name: 'Walk report' })).toBeInTheDocument()
  })
})
