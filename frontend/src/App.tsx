import { useEffect } from 'react'
import { RouterProvider, createBrowserRouter } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { UpdateBanner } from './components/UpdateBanner/UpdateBanner'
import { routes } from './routes'
import { startSync } from './services/sync'

const router = createBrowserRouter(routes)

export default function App() {
  // Send walk changes queued in IndexedDB whenever the server is reachable.
  useEffect(() => startSync(), [])

  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <UpdateBanner />
    </AuthProvider>
  )
}
