import { useState } from 'react'
import { usePushStatus } from '../../hooks/usePushStatus'
import { disablePush, enablePush, isIos, sendTestPush } from '../../services/push'
import type { PushStatus } from '../../services/push'

const STATUS_TEXT: Record<PushStatus, string> = {
  on: 'On for this device.',
  off: 'Off for this device.',
  denied: 'Blocked for this device.',
  'needs-install': 'Not available in a browser tab.',
  unsupported: "This browser doesn't support notifications.",
  'server-disabled': "Notifications aren't set up on the server yet.",
}

export function SettingsPage() {
  const [status] = usePushStatus()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setMessage(null)
    try {
      setMessage(await action())
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const turnOn = () =>
    run(async () => {
      const result = await enablePush()
      return result === 'on' ? null : STATUS_TEXT[result]
    })

  const turnOff = () =>
    run(async () => {
      await disablePush()
      return null
    })

  const test = () =>
    run(async () => {
      const sent = await sendTestPush()
      return sent ? 'Test notification sent.' : 'No devices received it. Try turning it off and on.'
    })

  return (
    <div className="page stack-lg">
      <h1 className="page-title">Settings</h1>

      <section className="card stack">
        <h2 className="section-label">Notifications</h2>
        <p>Get an alert if live GPS recording stops, for example when your phone locks.</p>
        <p className="muted" aria-live="polite">
          {status === null ? 'Checking…' : STATUS_TEXT[status]}
        </p>

        {status === 'off' && (
          <button className="btn btn-primary" onClick={turnOn} disabled={busy}>
            Turn on notifications
          </button>
        )}

        {status === 'on' && (
          <>
            <button className="btn btn-secondary" onClick={test} disabled={busy}>
              Send test notification
            </button>
            <button className="btn btn-ghost" onClick={turnOff} disabled={busy}>
              Turn off
            </button>
          </>
        )}

        {status === 'denied' && (
          <p className="muted">
            {isIos()
              ? 'To allow them, open iPhone Settings → Notifications → Dogwalker and turn on Allow Notifications.'
              : "Allow notifications for this site in your browser's site settings, then come back."}
          </p>
        )}

        {status === 'needs-install' && (
          <p className="muted">
            On iPhone, tap Share → Add to Home Screen, open Dogwalker from the Home Screen icon, and
            come back here.
          </p>
        )}

        {message && <p role="status">{message}</p>}
      </section>
    </div>
  )
}
