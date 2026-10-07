import type { WalkDetail, WalkListItem, WalkStatus } from '../types'
import { api } from './api'

export function listWalks({
  status,
  limit = 20,
  offset = 0,
}: { status?: WalkStatus[]; limit?: number; offset?: number } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  for (const s of status ?? []) params.append('status', s)
  return api.get<WalkListItem[]>(`/api/walks?${params}`)
}

export const getWalk = (id: string) => api.get<WalkDetail>(`/api/walks/${id}`)
