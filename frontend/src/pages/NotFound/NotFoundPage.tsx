import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main className="center-screen stack">
      <h1 className="page-title">Page not found</h1>
      <Link to="/" className="btn btn-secondary">
        Go home
      </Link>
    </main>
  )
}
