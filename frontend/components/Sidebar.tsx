'use client'

import { useState } from 'react'
import { useRoomsStore, Room } from '@/store/rooms.store'
import { useAuthStore } from '@/store/auth.store'

interface Props {
  onRoomSelect: (room: Room) => void
}

export default function Sidebar({ onRoomSelect }: Props) {
  const { rooms, activeRoom, createRoom } = useRoomsStore()
  const { user, logout } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    const room = await createRoom(newRoomName.trim(), newRoomDesc.trim())
    setNewRoomName('')
    setNewRoomDesc('')
    setShowCreate(false)
    onRoomSelect(room)
  }

  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
            <span className="font-mono text-white text-xs font-bold">&lt;/&gt;</span>
          </div>
          <span className="font-bold text-white text-sm">NexChat</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-7 h-7 rounded-lg bg-gray-800 hover:bg-violet-600 text-gray-400 hover:text-white transition-all flex items-center justify-center text-lg leading-none"
          title="Create room"
        >
          +
        </button>
      </div>

      {/* Create room form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="p-3 border-b border-gray-800 flex flex-col gap-2">
          <input
            autoFocus
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <input
            value={newRoomDesc}
            onChange={(e) => setNewRoomDesc(e.target.value)}
            placeholder="Description (optional)"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs py-2 rounded-lg transition-colors">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Rooms list */}
      <div className="flex-1 overflow-y-auto p-2">
        <p className="text-xs text-gray-500 font-mono uppercase tracking-widest px-2 mb-2">Rooms</p>
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => onRoomSelect(room)}
            className={`w-full text-left px-3 py-2.5 rounded-xl mb-1 transition-all group ${
              activeRoom?.id === room.id
                ? 'bg-violet-600/20 border border-violet-500/30'
                : 'hover:bg-gray-800 border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-400 text-sm">#</span>
                <span className="text-sm text-white truncate">{room.name}</span>
              </div>
              {room._count && (
                <span className="text-xs text-gray-500 shrink-0">{room._count.members}</span>
              )}
            </div>
            {room.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5 pl-4">{room.description}</p>
            )}
          </button>
        ))}
      </div>

      {/* User footer */}
      <div className="p-3 border-t border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-semibold">
              {user?.username?.[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-white truncate">{user?.username}</span>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-500 hover:text-red-400 transition-colors shrink-0"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
