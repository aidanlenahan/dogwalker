import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { setUnauthorizedHandler } from '../services/api'
import * as authApi from '../services/auth'
import { AuthContext } from './context'
import type { AuthContextValue, AuthState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const load = useCallback(() => {
    authApi
      .fetchCurrentUser()
      .then((user) => setState(user ? { status: 'signedIn', user } : { status: 'signedOut' }))
      .catch((err: Error) => setState({ status: 'error', message: err.message }))
  }, [])

  useEffect(() => {
    load()
    setUnauthorizedHandler(() => setState({ status: 'signedOut' }))
    return () => setUnauthorizedHandler(null)
  }, [load])

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      retry: () => {
        setState({ status: 'loading' })
        load()
      },
      login: async (username, password) => {
        const user = await authApi.login(username, password)
        setState({ status: 'signedIn', user })
      },
      logout: async () => {
        try {
          await authApi.logout()
        } finally {
          setState({ status: 'signedOut' })
        }
      },
    }),
    [state, load],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
