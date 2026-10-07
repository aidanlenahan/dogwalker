import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useUser } from '../../auth/context'
import { usePushStatus } from '../../hooks/usePushStatus'
import { enablePush, syncPushSubscription } from '../../services/push'
import { BellIcon, CloseIcon } from '../icons'

const PROMPTED_KEY = (userId: number) => `dw:push-prompted:${userId}`
// Session storage: the banner comes back on the next app launch.
const DISMISSED_KEY = 'dw:push-banner-dismissed'

function storageGet(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key)
  } catch {
    return null
  }
}

function storageSet(store: () => Storage, key: string): void {
  try {
    store().setItem(key, '1')
  } catch {
    // Private mode: the prompt may show again, which is harmless.
  }
}

/**
 * First sign-in on a device: a sheet offering notifications (the OS prompt only
 * appears from a tap, so we ask in-app first). Afterwards, while push is still
 * off, a dismissible banner on each app launch that links to Settings.
 */
export function NotificationNudge() {
  const user = useUser()
  const { pathname } = useLocation()
  const [status] = usePushStatus()
  const [prompted, setPrompted] = useState(
    () => storageGet(() => localStorage, PROMPTED_KEY(user.id)) === '1',
  )
  const [dismissed, setDismissed] = useState(
    () => storageGet(() => sessionStorage, DISMISSED_KEY) === '1',
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (status === 'on') void syncPushSubscription().catch(() => undefined)
  }, [status])

  function markPrompted() {
    storageSet(() => localStorage, PROMPTED_KEY(user.id))
    setPrompted(true)
    // Don't follow the sheet with the banner in the same launch.
    dismissBanner()
  }

  function dismissBanner() {
    storageSet(() => sessionStorage, DISMISSED_KEY)
    setDismissed(true)
  }

  async function turnOn() {
    setBusy(true)
    try {
      await enablePush()
    } catch {
      // Status refresh shows the outcome; Settings has the details.
    } finally {
      setBusy(false)
      markPrompted()
    }
  }

  if (pathname === '/settings') return null

  if (status === 'off' && !prompted) {
    return (
      <div className="sheet-backdrop">
        <div
          className="sheet stack"
          role="dialog"
          aria-modal="true"
          aria-labelledby="push-sheet-title"
        >
          <BellIcon className="sheet-icon" />
          <h2 id="push-sheet-title" className="sheet-title">
            Turn on notifications?
          </h2>
          <p className="muted">
            Dogwalker can alert you if live GPS recording stops, for example when your phone locks
            mid-walk.
          </p>
          <button className="btn btn-primary btn-xl" onClick={turnOn} disabled={busy}>
            {busy ? 'Turning on…' : 'Turn on notifications'}
          </button>
          <button className="btn btn-ghost" onClick={markPrompted} disabled={busy}>
            Not now
          </button>
        </div>
      </div>
    )
  }

  if ((status === 'off' || status === 'needs-install') && !dismissed) {
    return (
      <div className="nudge-banner" role="status">
        <BellIcon className="nudge-icon" />
        <span className="nudge-text">
          {status === 'off'
            ? 'Turn on notifications to know if GPS recording stops.'
            : 'Add Dogwalker to your Home Screen to get notifications.'}
        </span>
        <Link to="/settings" className="btn btn-secondary nudge-action">
          Settings
        </Link>
        <button className="nudge-close" onClick={dismissBanner} aria-label="Dismiss">
          <CloseIcon />
        </button>
      </div>
    )
  }

  return null
}
