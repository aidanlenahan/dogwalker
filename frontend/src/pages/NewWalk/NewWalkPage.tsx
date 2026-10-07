import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { startWalk } from '../../services/activeWalk'
import { listDogs } from '../../services/dogs'
import type { Dog, GpsMode, TrackingOptions } from '../../types'
import { AddDogForm } from '../Dogs/DogsPage'

const OPTIONS_KEY = 'dw:walk-options'
const DEFAULTS: TrackingOptions = {
  track_gps: true,
  track_stats: true,
  track_photos: true,
  track_activity: true,
  gps_mode: 'live',
}

/** Last-used tracking options (PRD §9: defaults remember the previous walk). */
function loadOptions(): TrackingOptions {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

function saveOptions(options: TrackingOptions) {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options))
  } catch {
    // Private mode: defaults next time.
  }
}

const TOGGLES: { key: keyof Omit<TrackingOptions, 'gps_mode'>; label: string }[] = [
  { key: 'track_gps', label: 'GPS route' },
  { key: 'track_stats', label: 'Walk statistics' },
  { key: 'track_photos', label: 'Photos' },
  { key: 'track_activity', label: 'Activity log' },
]

const GPS_MODES: { value: GpsMode; label: string; hint: string }[] = [
  { value: 'live', label: 'Record live', hint: 'Keep the app open during the walk.' },
  {
    value: 'upload',
    label: 'Record on another device',
    hint: 'Use a watch or another app, then upload the GPX after the walk.',
  },
]

export function NewWalkPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [dogs, setDogs] = useState<Dog[] | null>(null)
  const [dogId, setDogId] = useState<number | null>(() => Number(params.get('dog')) || null)
  const [options, setOptions] = useState(loadOptions)
  const [preWalkNotes, setPreWalkNotes] = useState('')
  const [addingDog, setAddingDog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    listDogs()
      .then((list) => {
        setDogs(list)
        setDogId((current) =>
          list.some((d) => d.id === current) ? current : list.length === 1 ? list[0].id : null,
        )
        if (list.length === 0) setAddingDog(true)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  async function onStart(e: FormEvent) {
    e.preventDefault()
    const dog = dogs?.find((d) => d.id === dogId)
    if (!dog) return setError('Pick a dog first.')
    setStarting(true)
    setError(null)
    try {
      saveOptions(options)
      const walk = await startWalk(dog, options, preWalkNotes)
      navigate(`/walk/${walk.id}/live`, { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setStarting(false)
    }
  }

  return (
    <div className="page stack-lg">
      <h1 className="page-title">New walk</h1>

      <section className="stack">
        <h2 className="section-label">Dog</h2>
        {dogs === null && !error && <p className="muted">Loading…</p>}
        {dogs && dogs.length > 0 && (
          <div className="choice-list" role="radiogroup" aria-label="Dog">
            {dogs.map((d) => (
              <label key={d.id} className="choice">
                <input
                  type="radio"
                  name="dog"
                  checked={dogId === d.id}
                  onChange={() => setDogId(d.id)}
                />
                <span className="choice-title">{d.name}</span>
                {d.owner_name && <span className="muted">{d.owner_name}</span>}
              </label>
            ))}
          </div>
        )}
        {addingDog ? (
          <AddDogForm
            onCancel={dogs && dogs.length > 0 ? () => setAddingDog(false) : undefined}
            onAdded={(dog) => {
              setDogs((prev) => [...(prev ?? []), dog])
              setDogId(dog.id)
              setAddingDog(false)
            }}
          />
        ) : (
          dogs && (
            <button type="button" className="btn btn-ghost" onClick={() => setAddingDog(true)}>
              + Add a dog
            </button>
          )
        )}
      </section>

      <form className="stack-lg" onSubmit={onStart}>
        <section className="stack">
          <h2 className="section-label">Track</h2>
          <div className="card stack">
            {TOGGLES.map(({ key, label }) => (
              <div key={key} className="stack">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                  />
                  {label}
                </label>
                {key === 'track_gps' && options.track_gps && (
                  <div className="sub-choices" role="radiogroup" aria-label="GPS recording">
                    {GPS_MODES.map((m) => (
                      <label key={m.value} className="choice choice-sm">
                        <input
                          type="radio"
                          name="gps_mode"
                          checked={(options.gps_mode ?? 'live') === m.value}
                          onChange={() => setOptions({ ...options, gps_mode: m.value })}
                        />
                        <span className="choice-title">{m.label}</span>
                        <span className="muted">{m.hint}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <label className="field">
          Pre-walk notes <span className="muted field-hint">optional</span>
          <textarea
            value={preWalkNotes}
            onChange={(e) => setPreWalkNotes(e.target.value)}
            rows={3}
            maxLength={5000}
          />
        </label>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button className="btn btn-primary btn-xl" disabled={starting || !dogId}>
          {starting ? 'Starting…' : 'Start walk'}
        </button>
      </form>
    </div>
  )
}
