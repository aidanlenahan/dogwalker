import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { deleteDog, getDog, updateDog } from '../../services/dogs'
import type { Dog } from '../../types'

export function DogPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dog, setDog] = useState<Dog | null>(null)
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getDog(id!)
      .then((d) => {
        setDog(d)
        setName(d.name)
        setOwnerName(d.owner_name ?? '')
        setNotes(d.notes ?? '')
      })
      .catch((e: Error) => setError(e.message))
  }, [id])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!dog) return
    if (!name.trim()) return setError("Enter the dog's name.")
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      setDog(await updateDog(dog.id, { name, owner_name: ownerName, notes }))
      setSaved(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!dog || !confirm(`Delete ${dog.name}?`)) return
    setBusy(true)
    setError(null)
    try {
      await deleteDog(dog.id)
      navigate('/dogs', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  if (!dog) {
    return (
      <div className="page stack">
        {error ? (
          <p className="card form-error" role="alert">
            {error}
          </p>
        ) : (
          <p className="muted">Loading…</p>
        )}
        <Link to="/dogs" className="btn btn-secondary">
          Back to dogs
        </Link>
      </div>
    )
  }

  return (
    <div className="page stack-lg">
      <h1 className="page-title">{dog.name}</h1>

      <Link to={`/walk/new?dog=${dog.id}`} className="btn btn-primary btn-lg">
        Start a walk with {dog.name}
      </Link>

      <form className="card stack" onSubmit={onSave} noValidate>
        <label className="field">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </label>
        <label className="field">
          Owner's name
          <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} maxLength={100} />
        </label>
        <label className="field">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Avoid other dogs, pulls near traffic…"
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {saved && <p role="status">Saved.</p>}
        <button className="btn btn-primary" disabled={busy}>
          Save
        </button>
      </form>

      <button className="btn btn-ghost btn-danger" onClick={onDelete} disabled={busy}>
        Delete dog
      </button>
      <Link to="/dogs" className="btn btn-ghost">
        Back to dogs
      </Link>
    </div>
  )
}
