/**
 * Heartbeats for the server's live-GPS watchdog (backend app/tracking.py).
 *
 * iOS suspends the app soon after the screen locks or the walker switches apps,
 * and a suspended page can't warn anyone. So while recording we check in every
 * few seconds and send a beacon on the way to the background; if the check-ins
 * stop, the server pushes a "GPS recording paused" notification.
 */
import { closeNotifications } from './push'

export const HEARTBEAT_MS = 5_000

export class LiveTrackingReporter {
  private readonly sessionId: string
  /** Same-origin path the notification opens. */
  private readonly resumeUrl: string
  private readonly base: string
  private timer: ReturnType<typeof setInterval> | null = null

  constructor(sessionId: string, resumeUrl: string) {
    this.sessionId = sessionId
    this.resumeUrl = resumeUrl
    this.base = `/api/tracking/${encodeURIComponent(sessionId)}`
  }

  start(): void {
    if (this.timer !== null) return
    this.heartbeat()
    this.timer = setInterval(this.heartbeat, HEARTBEAT_MS)
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('pagehide', this.onHidden)
    window.addEventListener('online', this.heartbeat)
    void closeNotifications(this.tagPrefix())
  }

  /** Stop checking in but leave the session open, so the server will alert. */
  pause(): void {
    if (this.timer === null) return
    clearInterval(this.timer)
    this.timer = null
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('pagehide', this.onHidden)
    window.removeEventListener('online', this.heartbeat)
  }

  /** Recording finished on purpose: close the session so no alert is sent. */
  stop(): void {
    this.pause()
    void fetch(this.base, { method: 'DELETE', credentials: 'same-origin', keepalive: true }).catch(
      () => undefined,
    )
    void closeNotifications(this.tagPrefix())
  }

  private tagPrefix() {
    return `gps-paused:${this.sessionId}`
  }

  private readonly heartbeat = () => {
    // iOS keeps the page running for a few seconds after it's hidden. Check-ins
    // from then must not tell the server we're fine, so skip them; the server
    // also ignores any with visible=false that were already in flight.
    const visible = document.visibilityState === 'visible'
    if (!visible) return
    void fetch(`${this.base}/heartbeat`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_url: this.resumeUrl, visible }),
      keepalive: true,
    }).catch(() => undefined) // Offline: the next one will get through.
  }

  private readonly onHidden = () => {
    // sendBeacon is the request most likely to leave before iOS freezes the page.
    if (!navigator.sendBeacon?.(`${this.base}/hidden`)) {
      void fetch(`${this.base}/hidden`, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
      }).catch(() => undefined)
    }
  }

  private readonly onVisibility = () => {
    if (document.visibilityState === 'hidden') return this.onHidden()
    // Back in the foreground: check in now and clear any "paused" alert.
    this.heartbeat()
    void closeNotifications(this.tagPrefix())
  }
}
