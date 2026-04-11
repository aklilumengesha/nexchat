'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface ChatItem {
  id: string
  name: string
  type: 'room' | 'dm'
}

interface Props {
  content: string
  onClose: () => void
}

export default function ForwardModal({ content, onClose }: Props) {
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [forwarded, setForwarded] = useState<string[]>([])
  const [allChats, setAllChats] = useState<ChatItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [roomsRes, dmsRes] = await Promise.all([
          api.get('/rooms'),
          api.get('/rooms/dm/list'),
        ])

        const rooms: ChatItem[] = roomsRes.data.map((r: { id: string; name: string }) => ({
          id: r.id,
          name: r.name,
          type: 'room' as const,
        }))

        const dms: ChatItem[] = dmsRes.data.map((d: {
          id: string
          name: string
          members?: { user: { id: string; username: string } }[]
        }) => {
          const other = d.members?.find((m) => m.user.id !== user?.id)
          return {
            id: d.id,
            name: other?.user.username || d.name,
            type: 'dm' as const,
          }
        })

        setAllChats([...dms, ...rooms])
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = allChats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const forward = async (roomId: string) => {
    if (forwarded.includes(roomId)) return
    try {
      await api.post(`/rooms/${roomId}/messages`, { content: `↪ Forwarded: ${content}` })
      setForwarded((prev) => [...prev, roomId])
    } catch {
      alert('Could not forward — you may not be a member of that room.')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[#212121] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-sm">Forward Message</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Message preview */}
        <div className="mx-4 mt-3 bg-[#2d2d2d] rounded-xl px-3 py-2.5">
          <p className="text-xs text-gray-500 mb-1">Message to forward</p>
          <p className="text-sm text-gray-300 line-clamp-2">{content}</p>
        </div>

        {/* Search */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 bg-[#2d2d2d] rounded-full px-3 py-2">
            <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rooms and chats..."
              className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none flex-1"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-64 overflow-y-auto px-2 pb-3">
          {loading && (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-t-violet-500 animate-spin" />
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <p className="text-center text-gray-600 text-xs py-4">No chats found</p>
          )}

          {!loading && filtered.map((chat) => {
            const done = forwarded.includes(chat.id)
            return (
              <button
                key={chat.id}
                onClick={() => forward(chat.id)}
                disabled={done}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${done ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0 ${chat.type === 'dm' ? 'bg-emerald-600' : 'bg-violet-600'}`}>
                  {chat.type === 'dm' ? chat.name[0]?.toUpperCase() : '#'}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm text-white truncate">{chat.name}</p>
                  <p className="text-[11px] text-gray-500">{chat.type === 'dm' ? 'Direct Message' : 'Room'}</p>
                </div>
                {done ? (
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>

        {forwarded.length > 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={onClose}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
            >
              Done ({forwarded.length} forwarded)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
