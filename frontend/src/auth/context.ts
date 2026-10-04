import { createContext, useContext } from 'react'
import type { User } from '../types'

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; user: User }
  | { status: 'error'; message: string }

export interface AuthContextValue {
  state: AuthState
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  retry: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** The signed-in user. Only call below <RequireAuth>. */
export function useUser(): User {
  const { state } = useAuth()
  if (state.status !== 'signedIn') throw new Error('useUser called while signed out')
  return state.user
}
