import { create } from 'zustand'
import api from '@/lib/api'

export interface Room {
  id: string
  name: string
  description?: string
  isPrivate: boolean
  isDm?: boolean
  createdBy: string
  createdAt: string
  _count?: { members: number; messages: number }
  members?: { user: { id: string; username: string; avatar?: string } }[]
  messages?: { content: string }[]
}

export interface Message {
  id: string
  roomId: string
  userId: string
  content: string
  createdAt: string
  updatedAt?: string
  replyToId?: string
  replyTo?: { id: string; content: string; user: { id: string; username: string } } | null
  user: { id: string; username: string; avatar?: string }
  reactions?: { emoji: string; userId: string }[]
}

interface RoomsState {
  rooms: Room[]
  activeRoom: Room | null
  messages: Message[]
  typingUsers: Record<string, string[]>
  unreadCounts: Record<string, number>
  loading: boolean
  fetchRooms: () => Promise<void>
  setActiveRoom: (room: Room) => void
  fetchMessages: (roomId: string) => Promise<void>
  addMessage: (msg: Message) => void
  updateMessage: (msg: Message) => void
  deleteMessage: (messageId: string) => void
  createRoom: (name: string, description?: string) => Promise<Room>
  joinRoom: (roomId: string) => Promise<void>
  setTyping: (roomId: string, username: string, isTyping: boolean) => void
  dms: Room[]
  fetchDms: () => Promise<void>
  startDm: (targetUserId: string) => Promise<Room>
  loadMoreMessages: (msgs: Message[]) => void
  incrementUnread: (roomId: string) => void
  clearUnread: (roomId: string) => void
}

export const useRoomsStore = create<RoomsState>((set, get) => ({
  rooms: [],
  dms: [],
  activeRoom: null,
  messages: [],
  typingUsers: {},
  unreadCounts: {},
  loading: false,

  fetchRooms: async () => {
    set({ loading: true })
    const { data } = await api.get('/rooms')
    set({ rooms: data, loading: false })
  },

  setActiveRoom: (room) => set((state) => ({
    activeRoom: room,
    messages: [],
    unreadCounts: { ...state.unreadCounts, [room.id]: 0 },
  })),
  fetchMessages: async (roomId) => {
    const { data } = await api.get(`/rooms/${roomId}/messages`)
    set({ messages: [...data].reverse() })
  },

  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),

  updateMessage: (updated: Message) =>
    set((state) => ({
      messages: state.messages.map((m) => m.id === updated.id ? { ...m, ...updated } : m),
    })),

  deleteMessage: (messageId: string) =>
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== messageId),
    })),  createRoom: async (name, description) => {
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

  incrementUnread: (roomId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [roomId]: (state.unreadCounts[roomId] || 0) + 1,
      },
    })),

  loadMoreMessages: (msgs) =>
    set((state) => ({ messages: [...msgs, ...state.messages] })),

  clearUnread: (roomId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    })),

  fetchDms: async () => {
    const { data } = await api.get('/rooms/dm/list')
    set({ dms: data })
  },

  startDm: async (targetUserId) => {
    const { data } = await api.post(`/rooms/dm/${targetUserId}`)
    set((state) => {
      const exists = state.dms.find((d) => d.id === data.id)
      return { dms: exists ? state.dms : [data, ...state.dms] }
    })
    return data
  },
}))
