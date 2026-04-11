'use client'

import { useState } from 'react'
import { useRoomsStore } from '@/store/rooms.store'
import { useAuthStore } from '@/store/auth.store'
import { connectSocket } from '@/lib/socket'

interface Props {
  content: string
  onClose: () => void
}

export default function ForwardModal({ content, onClose }: Props) {
  const { rooms, dms } = useRoomsStore()
  const { user } = useAuthStore()
  const [search, setSearch] = useState('')
  const [forwarded, setForwarded] = useState<string[]>([])

  const getDmName = (room: typeof dms[0]) => {
    const other = room.members?.find((m) => m.user.id !== user?.id)
    return other?.user.username || room.name
  }

  const allChats = [
    ...rooms.map((r) => ({ id: r.id, name: r.name, type: 'room' as const })),
    ...dms.map((d) => ({ id: d.id, name: getDmName(d), type: 'dm' as const })),
  ].filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))

  const forward = (roomId: string) => {
    if (forwarded.includes(roomId)) return
    const socket = connectSocket()
    socket.emit('message:send', { roomId, content: `↪ Forwarded: ${content}` })
    setForwarded((prev) => [...prev, roomId])
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
          {allChats.length === 0 && (
            <p className="text-center text-gray-600 text-xs py-4">No chats found</p>
          )}
          {allChats.map((chat) => {
            const done = forwarded.includes(chat.id)
            return (
              <button
                key={chat.id}
                onClick={() => forward(chat.id)}
                disabled={done}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${done ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/5'}`}
              >
                <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
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
