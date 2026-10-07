import { useEffect, useState, useSyncExternalStore } from 'react'
import { getLocalWalk, listLocalWalks, type LocalWalk } from '../services/localDb'
import { getSyncState, subscribeSync, type SyncState } from '../services/sync'

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSync, getSyncState)
}

/** Re-runs `load` now and whenever local walk data or sync state changes. */
function useLocal<T>(
  load: () => Promise<T>,
  deps: unknown[],
): { value: T | undefined; loaded: boolean } {
  const [result, setResult] = useState<{ value: T | undefined; loaded: boolean }>({
    value: undefined,
    loaded: false,
  })
  useEffect(() => {
    let cancelled = false
    const run = () =>
      load()
        .then((value) => !cancelled && setResult({ value, loaded: true }))
        .catch(() => !cancelled && setResult({ value: undefined, loaded: true }))
    run()
    const unsubscribe = subscribeSync(run)
    return () => {
      cancelled = true
      unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return result
}

export function useLocalWalk(id: string | undefined) {
  return useLocal(() => (id ? getLocalWalk(id) : Promise.resolve(undefined)), [id])
}

export function useLocalWalks(): LocalWalk[] {
  return useLocal(listLocalWalks, []).value ?? []
}
