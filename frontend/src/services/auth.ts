import type { User } from '../types'
import { ApiError, api, request } from './api'

/** Returns the signed-in user, or null if there is no valid session. */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    return await request<User>('GET', '/api/auth/me', undefined, { skipUnauthorizedHandler: true })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export function login(username: string, password: string): Promise<User> {
  return request<User>(
    'POST',
    '/api/auth/login',
    { username, password },
    {
      skipUnauthorizedHandler: true,
    },
  )
}

export function logout(): Promise<void> {
  return api.post<void>('/api/auth/logout')
}
