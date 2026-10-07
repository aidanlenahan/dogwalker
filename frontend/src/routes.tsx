import { Navigate } from 'react-router'
import type { RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/AppShell/AppShell'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { GpsSpikePage } from './pages/GpsSpike/GpsSpikePage'
import { LoginPage } from './pages/Login/LoginPage'
import { NotFoundPage } from './pages/NotFound/NotFoundPage'
import { SettingsPage } from './pages/Settings/SettingsPage'
import { StubPage } from './pages/Stub/StubPage'

// PRD §28 routes. Stubs are filled in by later TODO phases.
export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },

  // Public, no login: client walk report and walker profile.
  { path: '/w/:shareToken', element: <StubPage title="Walk report" phase={4} /> },
  { path: '/u/:username', element: <StubPage title="Walker profile" phase={9} /> },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
          { path: '/dogs', element: <StubPage title="Dogs" phase={3} /> },
          { path: '/dogs/:id', element: <StubPage title="Dog" phase={3} /> },
          { path: '/walk/new', element: <StubPage title="New walk" phase={3} /> },
          { path: '/walk/:id/live', element: <StubPage title="Active walk" phase={3} /> },
          { path: '/walk/:id/review', element: <StubPage title="Review walk" phase={4} /> },
          { path: '/walk/:id', element: <StubPage title="Walk" phase={3} /> },
          { path: '/profile/edit', element: <StubPage title="Edit profile" phase={9} /> },
          { path: '/settings', element: <SettingsPage /> },
          // Throwaway GPS feasibility spike (TODO Phase 2).
          { path: '/dev/gps', element: <GpsSpikePage /> },
        ],
      },
    ],
  },

  { path: '*', element: <NotFoundPage /> },
]
