import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/context'
import type { AuthContextValue } from '../../auth/context'
import type { PushStatus } from '../../services/push'
import { NotificationNudge } from './NotificationNudge'

const push = vi.hoisted(() => ({
  status: 'off' as PushStatus,
  enablePush: vi.fn(async () => 'on' as PushStatus),
}))

vi.mock('../../services/push', () => ({
  getPushStatus: async () => push.status,
  onPushChange: () => () => undefined,
  enablePush: push.enablePush,
  syncPushSubscription: async () => undefined,
}))

const auth: AuthContextValue = {
  state: { status: 'signedIn', user: { id: 7, username: 'aidan', display_name: 'Aidan' } },
  login: async () => undefined,
  logout: async () => undefined,
  retry: () => undefined,
}

function renderNudge(path = '/dashboard') {
  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <NotificationNudge />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  push.status = 'off'
  push.enablePush.mockClear()
})

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('NotificationNudge', () => {
  it('asks on first sign-in and remembers "Not now" without also showing the banner', async () => {
    renderNudge()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Not now' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(localStorage.getItem('dw:push-prompted:7')).toBe('1')
  })

  it('turns push on from the first-sign-in sheet', async () => {
    renderNudge()
    await userEvent
      .setup()
      .click(await screen.findByRole('button', { name: 'Turn on notifications' }))
    expect(push.enablePush).toHaveBeenCalledOnce()
  })

  it('shows a dismissible banner on later launches while push is off', async () => {
    localStorage.setItem('dw:push-prompted:7', '1')
    renderNudge()
    expect(await screen.findByRole('status')).toHaveTextContent('Turn on notifications')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('dw:push-banner-dismissed')).toBe('1')
  })

  it('tells iPhone browser-tab users to install first', async () => {
    push.status = 'needs-install'
    renderNudge()
    expect(await screen.findByRole('status')).toHaveTextContent('Add Dogwalker to your Home Screen')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it.each<PushStatus>(['on', 'denied', 'unsupported', 'server-disabled'])(
    'stays hidden when push is %s',
    async (status) => {
      push.status = status
      const { container } = renderNudge()
      await new Promise((r) => setTimeout(r, 0))
      expect(container).toBeEmptyDOMElement()
    },
  )
})
