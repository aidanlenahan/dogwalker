export interface User {
  id: number
  username: string
  display_name: string
}

export interface Dog {
  id: number
  name: string
  owner_name: string | null
  notes: string | null
  created_at: string
}

export const EVENT_TYPES = ['pee', 'poop', 'water', 'fed', 'note', 'other'] as const
export type EventType = (typeof EVENT_TYPES)[number]

export type WalkStatus = 'created' | 'active' | 'completed' | 'published'
export type GpsMode = 'live' | 'upload'

export interface WalkEvent {
  id: string
  type: EventType
  /** ISO 8601 with offset. */
  timestamp: string
  notes: string | null
  latitude: number | null
  longitude: number | null
}

export interface TrackingOptions {
  track_gps: boolean
  track_stats: boolean
  track_photos: boolean
  track_activity: boolean
  gps_mode: GpsMode | null
}

export interface Walk extends TrackingOptions {
  id: string
  dog: { id: number; name: string }
  status: WalkStatus
  started_at: string | null
  ended_at: string | null
  distance_meters: number | null
  pre_walk_notes: string | null
  notes: string | null
  created_at: string
}

export interface WalkDetail extends Walk {
  events: WalkEvent[]
}

export interface WalkListItem extends Walk {
  event_count: number
}
