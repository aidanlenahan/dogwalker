/**
 * Web Push subscription for this device. iOS only offers push to Home Screen
 * apps (16.4+), and only asks for permission from a tap.
 */
import { api } from './api'

export type PushStatus =
  /** Browser has no service worker / Push API. */
  | 'unsupported'
  /** iOS in a Safari tab: push needs the app added to the Home Screen first. */
  | 'needs-install'
  /** Server has no VAPID keys. */
  | 'server-disabled'
  | 'denied'
  | 'off'
  | 'on'

const CHANGE_EVENT = 'dw:push-change'

let publicKey: string | null | undefined

export function isIos(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac.
    (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
  )
}

export function isStandalone(): boolean {
  return (
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function pushApiAvailable(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** The active registration, or null if none shows up quickly (e.g. `vite dev`). */
async function registration(timeoutMs = 4000): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs))
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

async function serverKey(): Promise<string | null> {
  if (publicKey === undefined) {
    publicKey = (await api.get<{ public_key: string | null }>('/api/push/config')).public_key
  }
  return publicKey
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const b64 = (value + '='.repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function saveSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  await api.put('/api/push/subscriptions', { endpoint: json.endpoint, keys: json.keys })
}

function announce() {
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Re-run `listener` whenever push is turned on or off in this tab. */
export function onPushChange(listener: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, listener)
  return () => window.removeEventListener(CHANGE_EVENT, listener)
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!pushApiAvailable()) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  try {
    if (!(await serverKey())) return 'server-disabled'
  } catch {
    // Offline: fall through and report what the device knows.
  }
  if (Notification.permission === 'denied') return 'denied'
  const reg = await registration()
  if (!reg) return 'unsupported'
  const sub = await reg.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

/**
 * Ask for permission and subscribe. Call straight from a click handler: iOS
 * only shows the permission prompt during a user gesture.
 */
export async function enablePush(): Promise<PushStatus> {
  // Before any other await, so the gesture still counts.
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    announce()
    return permission === 'denied' ? 'denied' : 'off'
  }
  const [reg, key] = await Promise.all([registration(), serverKey()])
  if (!reg) return 'unsupported'
  if (!key) return 'server-disabled'
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToBytes(key),
    }))
  await saveSubscription(sub)
  announce()
  return 'on'
}

export async function disablePush(): Promise<void> {
  const reg = await registration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await api.post('/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined)
    await sub.unsubscribe()
  }
  announce()
}

/** Re-send this device's subscription (cheap, idempotent) so the server never loses it. */
export async function syncPushSubscription(): Promise<void> {
  if (!pushApiAvailable() || Notification.permission !== 'granted') return
  const sub = await (await registration())?.pushManager.getSubscription()
  if (sub) await saveSubscription(sub)
}

export async function sendTestPush(): Promise<number> {
  return (await api.post<{ sent: number }>('/api/push/test')).sent
}

/** Close notifications shown by the service worker whose tag starts with `prefix`. */
export async function closeNotifications(prefix: string): Promise<void> {
  const reg = await registration(1000)
  const shown = (await reg?.getNotifications()) ?? []
  for (const n of shown) if (n.tag.startsWith(prefix)) n.close()
}
