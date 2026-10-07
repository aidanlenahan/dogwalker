import { Navigate } from 'react-router'
import type { RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/AppShell/AppShell'
import { ActiveWalkPage } from './pages/ActiveWalk/ActiveWalkPage'
import { DashboardPage } from './pages/Dashboard/DashboardPage'
import { DogPage } from './pages/Dogs/DogPage'
import { DogsPage } from './pages/Dogs/DogsPage'
import { GpsSpikePage } from './pages/GpsSpike/GpsSpikePage'
import { LoginPage } from './pages/Login/LoginPage'
import { NewWalkPage } from './pages/NewWalk/NewWalkPage'
import { NotFoundPage } from './pages/NotFound/NotFoundPage'
import { SettingsPage } from './pages/Settings/SettingsPage'
import { StubPage } from './pages/Stub/StubPage'
import { WalkDetailPage } from './pages/WalkDetail/WalkDetailPage'
import { WalksPage } from './pages/Walks/WalksPage'

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
          { path: '/dogs', element: <DogsPage /> },
          { path: '/dogs/:id', element: <DogPage /> },
          { path: '/walks', element: <WalksPage /> },
          { path: '/walk/new', element: <NewWalkPage /> },
          { path: '/walk/:id/live', element: <ActiveWalkPage /> },
          { path: '/walk/:id/review', element: <StubPage title="Review walk" phase={4} /> },
          { path: '/walk/:id', element: <WalkDetailPage /> },
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
