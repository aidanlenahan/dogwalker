import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router'
import { createDog, listDogs } from '../../services/dogs'
import type { Dog } from '../../types'

export function DogsPage() {
  const [dogs, setDogs] = useState<Dog[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    listDogs()
      .then(setDogs)
      .catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="page stack-lg">
      <h1 className="page-title">Dogs</h1>

      {error && (
        <p className="card form-error" role="alert">
          {error}
        </p>
      )}

      {dogs === null && !error && <p className="muted">Loading…</p>}

      {dogs && dogs.length === 0 && !adding && (
        <p className="card muted">No dogs yet. Add the dogs you walk to start logging walks.</p>
      )}

      {dogs && dogs.length > 0 && (
        <ul className="list">
          {dogs.map((d) => (
            <li key={d.id}>
              <Link to={`/dogs/${d.id}`} className="list-row">
                <span className="list-title">{d.name}</span>
                {d.owner_name && <span className="muted">{d.owner_name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <AddDogForm
          onCancel={() => setAdding(false)}
          onAdded={(dog) => {
            setDogs((prev) => [...(prev ?? []), dog].sort((a, b) => a.name.localeCompare(b.name)))
            setAdding(false)
          }}
        />
      ) : (
        <button className="btn btn-primary btn-lg" onClick={() => setAdding(true)}>
          Add a dog
        </button>
      )}
    </div>
  )
}

export function AddDogForm({
  onAdded,
  onCancel,
}: {
  onAdded: (dog: Dog) => void
  onCancel?: () => void
}) {
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setError("Enter the dog's name.")
    setSaving(true)
    setError(null)
    try {
      onAdded(await createDog({ name, owner_name: ownerName }))
    } catch (err) {
      setError((err as Error).message)
      setSaving(false)
    }
  }

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate>
      <label className="field">
        Dog's name
        <input value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={100} />
      </label>
      <label className="field">
        Owner's name <span className="muted field-hint">optional</span>
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} maxLength={100} />
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary" disabled={saving}>
        {saving ? 'Saving…' : 'Save dog'}
      </button>
      {onCancel && (
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      )}
    </form>
  )
}
