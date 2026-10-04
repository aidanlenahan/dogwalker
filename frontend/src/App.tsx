import { RouterProvider, createBrowserRouter } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { UpdateBanner } from './components/UpdateBanner/UpdateBanner'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <UpdateBanner />
    </AuthProvider>
  )
}
