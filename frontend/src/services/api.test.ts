import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, setUnauthorizedHandler } from './api'

function mockFetch(status: number, body?: unknown) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('api', () => {
  afterEach(() => setUnauthorizedHandler(null))

  it('sends JSON with same-origin credentials', async () => {
    const fetch = mockFetch(200, { ok: true })
    await expect(api.post('/api/x', { a: 1 })).resolves.toEqual({ ok: true })
    const [, init] = fetch.mock.calls[0]
    expect(init?.credentials).toBe('same-origin')
    expect(init?.body).toBe('{"a":1}')
  })

  it('surfaces FastAPI error detail', async () => {
    mockFetch(400, { detail: 'Nope' })
    await expect(api.get('/api/x')).rejects.toMatchObject({ status: 400, message: 'Nope' })
  })

  it('calls the unauthorized handler on 401', async () => {
    mockFetch(401, { detail: 'Not signed in' })
    const handler = vi.fn()
    setUnauthorizedHandler(handler)
    await expect(api.get('/api/x')).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('reports network failures as status 0', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(api.get('/api/x')).rejects.toMatchObject({ status: 0 })
  })

  it('returns undefined for 204', async () => {
    mockFetch(204)
    await expect(api.post('/api/auth/logout')).resolves.toBeUndefined()
  })
})
