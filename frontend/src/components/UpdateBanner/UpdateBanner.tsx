import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Registers the service worker and offers a reload when a new version is ready.
 * Prompting (instead of auto-reloading) avoids yanking the page mid-walk.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null
  return (
    <div className="update-banner" role="status">
      <span>A new version is available.</span>
      <button className="btn btn-primary" onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
      <button className="btn btn-ghost" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  )
}
