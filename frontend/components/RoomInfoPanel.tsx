'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { useRoomsStore } from '@/store/rooms.store'
import { usePresenceStore } from '@/store/presence.store'
import api from '@/lib/api'

interface Member {
  id: string
  userId: string
  joinedAt: string
  user: { id: string; username: string; avatar?: string }
}

interface Props {
  roomId: string
  roomName: string
  roomDescription?: string
  createdBy: string
  onClose: () => void
  onLeave: () => void
}

export default function RoomInfoPanel({ roomId, roomName, roomDescription, createdBy, onClose, onLeave }: Props) {
  const { user } = useAuthStore()
  const { setActiveRoom } = useRoomsStore()
  const { onlineUsers } = usePresenceStore()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const [tab, setTab] = useState<'info' | 'members'>('members')

  useEffect(() => {
    api.get(`/rooms/${roomId}`).then((res) => {
      setMembers(res.data.members || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [roomId])

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this room?')) return
    setLeaving(true)
    try {
      await api.delete(`/rooms/${roomId}/leave`)
      setActiveRoom(null as any)
      onLeave()
      onClose()
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      alert(e.response?.data?.message || 'Failed to leave room')
    } finally {
      setLeaving(false)
    }
  }

  const isCreator = user?.id === createdBy
  const onlineCount = members.filter(m => onlineUsers.has(m.user.id)).length

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#212121] border-l border-white/10 flex flex-col z-30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-semibold text-sm">{roomName}</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setTab('members')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'members' ? 'text-white border-b-2 border-violet-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Members {members.length > 0 && `(${members.length})`}
        </button>
        <button
          onClick={() => setTab('info')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'info' ? 'text-white border-b-2 border-violet-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Info
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'members' && (
          <div className="p-3">
            {/* Online count */}
            <p className="text-[11px] text-gray-500 font-mono uppercase tracking-widest px-1 mb-2">
              {onlineCount} online · {members.length} members
            </p>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-t-violet-500 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {members.map((m) => {
                  const isOnline = onlineUsers.has(m.user.id)
                  const isOwner = m.user.id === createdBy
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="relative shrink-0">
                        {m.user.avatar ? (
                          <img src={m.user.avatar} alt={m.user.username} className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-semibold">
                            {m.user.username[0].toUpperCase()}
                          </div>
                        )}
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#212121]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium truncate">{m.user.username}</p>
                        <p className={`text-[11px] ${isOnline ? 'text-green-500' : 'text-gray-600'}`}>
                          {isOnline ? 'online' : 'offline'}
                        </p>
                      </div>
                      {isOwner && (
                        <span className="text-[10px] bg-violet-600/30 text-violet-400 px-2 py-0.5 rounded-full font-mono shrink-0">
                          owner
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'info' && (
          <div className="p-4 flex flex-col gap-4">
            <div>
              <p className="text-[11px] text-gray-500 font-mono uppercase tracking-widest mb-1">Room Name</p>
              <p className="text-white text-sm">{roomName}</p>
            </div>
            {roomDescription && (
              <div>
                <p className="text-[11px] text-gray-500 font-mono uppercase tracking-widest mb-1">Description</p>
                <p className="text-gray-300 text-sm leading-relaxed">{roomDescription}</p>
              </div>
            )}
            <div>
              <p className="text-[11px] text-gray-500 font-mono uppercase tracking-widest mb-1">Members</p>
              <p className="text-white text-sm">{members.length} members · {onlineCount} online</p>
            </div>
          </div>
        )}
      </div>

      {/* Leave room button — only for non-creators */}
      {!isCreator && (
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLeave}
            disabled={leaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {leaving ? 'Leaving...' : 'Leave Room'}
          </button>
        </div>
      )}
    </div>
  )
}
