import type { Dog } from '../types'
import { api } from './api'

export interface DogInput {
  name: string
  owner_name?: string | null
  notes?: string | null
}

export const listDogs = () => api.get<Dog[]>('/api/dogs')
export const getDog = (id: number | string) => api.get<Dog>(`/api/dogs/${id}`)
export const createDog = (body: DogInput) => api.post<Dog>('/api/dogs', body)
export const updateDog = (id: number, body: Partial<DogInput>) =>
  api.patch<Dog>(`/api/dogs/${id}`, body)
export const deleteDog = (id: number) => api.delete<void>(`/api/dogs/${id}`)
