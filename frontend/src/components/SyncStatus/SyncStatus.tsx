import { useSyncState } from '../../hooks/useSync'

/** "Offline · 3 changes waiting to sync" (PRD §26). Hidden when everything is sent. */
export function SyncStatus() {
  const { pending, failed, offline } = useSyncState()
  if (!pending && !failed) return null
  const parts: string[] = []
  if (offline) parts.push('Offline')
  if (pending) parts.push(`${pending} ${pending === 1 ? 'change' : 'changes'} waiting to sync`)
  if (failed) parts.push(`${failed} couldn't be saved`)
  return (
    <p className={`sync-status${failed ? ' sync-status-error' : ''}`} role="status">
      {parts.join(' · ')}
    </p>
  )
}
