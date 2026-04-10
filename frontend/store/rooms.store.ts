import { create } from 'zustand'
import api from '@/lib/api'

export interface Room {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  createdBy: string
  createdAt: string
  _count?: { members: number; messages: number }
}

export interface Message {
  id: string
  roomId: string
  userId: string
  content: string
  createdAt: string
  user: { id: string; username: string; avatar?: string }
  reactions?: { emoji: string; userId: string }[]
}

interface RoomsState {
  rooms: Room[]
  activeRoom: Room | null
  messages: Message[]
  typingUsers: Record<string, string[]>
  loading: boolean
  fetchRooms: () => Promise<void>
  setActiveRoom: (room: Room) => void
  fetchMessages: (roomId: string) => Promise<void>
  addMessage: (msg: Message) => void
  createRoom: (name: string, description?: string) => Promise<Room>
  joinRoom: (roomId: string) => Promise<void>
  setTyping: (roomId: string, username: string, isTyping: boolean) => void
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  activeRoom: null,
  messages: [],
  typingUsers: {},
  loading: false,

  fetchRooms: async () => {
    set({ loading: true })
    const { data } = await api.get('/rooms')
    set({ rooms: data, loading: false })
  },

  setActiveRoom: (room) => set({ activeRoom: room, messages: [] }),

  fetchMessages: async (roomId) => {
    const { data } = await api.get(`/rooms/${roomId}/messages`)
    set({ messages: [...data].reverse() })
  },

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),  createRoom: async (name, description) => {
    const { data } = await api.post('/rooms', { name, description })
    set((state) => ({ rooms: [data, ...state.rooms] }))
    return data
  },

  joinRoom: async (roomId) => {
    await api.post(`/rooms/${roomId}/join`)
    await get().fetchRooms()
  },

  setTyping: (roomId, username, isTyping) =>
    set((state) => {
      const current = state.typingUsers[roomId] || []
      const updated = isTyping
        ? current.includes(username) ? current : [...current, username]
        : current.filter((u) => u !== username)
      return { typingUsers: { ...state.typingUsers, [roomId]: updated } }
    }),
}))
