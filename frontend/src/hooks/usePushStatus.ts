import { useCallback, useEffect, useState } from 'react'
import { getPushStatus, onPushChange } from '../services/push'
import type { PushStatus } from '../services/push'

/** This device's push status; null while loading. Updates when push is toggled. */
export function usePushStatus(): [PushStatus | null, () => void] {
  const [status, setStatus] = useState<PushStatus | null>(null)

  const refresh = useCallback(() => {
    getPushStatus()
      .then(setStatus)
      .catch(() => setStatus('unsupported'))
  }, [])

  useEffect(() => {
    refresh()
    return onPushChange(refresh)
  }, [refresh])

  return [status, refresh]
}
