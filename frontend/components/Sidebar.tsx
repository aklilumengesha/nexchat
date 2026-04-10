'use client'

import { useState } from 'react'
import { useRoomsStore, Room } from '@/store/rooms.store'
import { useAuthStore } from '@/store/auth.store'

interface Props {
  onRoomSelect: (room: Room) => void
}

function RoomAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  const sz = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

export default function Sidebar({ onRoomSelect }: Props) {
  const { rooms, activeRoom, createRoom } = useRoomsStore()
  const { user, logout } = useAuthStore()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  )

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
    <aside className="w-80 bg-[#212121] flex flex-col h-full border-r border-white/5">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* User avatar */}
          <button className="relative">
            <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#212121]" />
          </button>
          <span className="text-white font-semibold text-sm">NexChat</span>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          title="New room"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 bg-[#2d2d2d] rounded-full px-3 py-2">
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none flex-1"
          />
        </div>
      </div>

      {/* Create room form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mx-3 mb-2 bg-[#2d2d2d] rounded-xl p-3 flex flex-col gap-2">
          <input
            autoFocus
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room name"
            className="bg-[#3d3d3d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <input
            value={newRoomDesc}
            onChange={(e) => setNewRoomDesc(e.target.value)}
            placeholder="Description (optional)"
            className="bg-[#3d3d3d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs py-2 rounded-lg transition-colors font-medium">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-gray-400 text-xs py-2 rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <p className="text-center text-gray-600 text-xs mt-8">
            {search ? 'No rooms found' : 'No rooms yet'}
          </p>
        )}
        {filtered.map((room) => {
          const isActive = activeRoom?.id === room.id
          return (
            <button
              key={room.id}
              onClick={() => onRoomSelect(room)}
              className={`w-full flex items-center gap-3 px-3 py-3 transition-colors ${
                isActive ? 'bg-violet-600/20' : 'hover:bg-white/5'
              }`}
            >
              <RoomAvatar name={room.name} />
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">{room.name}</span>
                  {room._count && (
                    <span className="text-[11px] text-gray-500 shrink-0 ml-2">
                      {room._count.members} members
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {room.description || `# ${room.name}`}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Bottom user bar */}
      <div className="px-3 py-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium truncate">{user?.username}</p>
            <p className="text-[11px] text-green-500">online</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-600 hover:text-red-400 transition-colors shrink-0 ml-2"
          title="Sign out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
