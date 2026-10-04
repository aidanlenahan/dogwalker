import { Link } from 'react-router'

/** Placeholder for routes that later phases will build out. */
export function StubPage({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="page stack">
      <h1 className="page-title">{title}</h1>
      <p className="card muted">Coming in phase {phase}.</p>
      <Link to="/dashboard" className="btn btn-secondary">
        Back to home
      </Link>
    </div>
  )
}
