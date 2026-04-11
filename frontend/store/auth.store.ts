import { create } from 'zustand'
import api from '@/lib/api'

interface User {
  id: string
  email: string
  username: string
  avatar?: string
  bio?: string
}

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('nexchat_token') : null,
  loading: false,

  login: async (email, password) => {
    set({ loading: true })
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('nexchat_token', data.token)
    set({ user: data.user, token: data.token, loading: false })
  },

  register: async (email, username, password) => {
    set({ loading: true })
    const { data } = await api.post('/auth/register', { email, username, password })
    localStorage.setItem('nexchat_token', data.token)
    set({ user: data.user, token: data.token, loading: false })
  },

  logout: () => {
    localStorage.removeItem('nexchat_token')
    set({ user: null, token: null })
    window.location.href = '/login'
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get('/auth/me')
      set({ user: data })
    } catch {
      set({ user: null, token: null })
    }
  },
}))
