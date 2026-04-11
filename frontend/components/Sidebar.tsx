'use client'

import { useState, useEffect } from 'react'
import { useRoomsStore, Room } from '@/store/rooms.store'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface Props {
  onRoomSelect: (room: Room) => void
}

function RoomAvatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-rose-500','bg-amber-500','bg-cyan-500','bg-pink-500']
  const color = colors[name.charCodeAt(0) % colors.length]
  const sz = size === 'sm' ? 'w-10 h-10 text-sm' : 'w-10 h-10 text-sm'
  return (
    <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

interface UserItem { id: string; username: string; avatar?: string }

export default function Sidebar({ onRoomSelect }: Props) {
  const { rooms, activeRoom, createRoom, dms, fetchDms, startDm } = useRoomsStore()
  const { user, logout } = useAuthStore()
  const unreadCounts = useRoomsStore((s) => s.unreadCounts)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showNewDm, setShowNewDm] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDesc, setNewRoomDesc] = useState('')
  const [users, setUsers] = useState<UserItem[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [tab, setTab] = useState<'rooms' | 'dms'>('rooms')

  useEffect(() => {
    fetchDms()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const openNewDm = async () => {
    const { data } = await api.get('/rooms/users/all')
    setUsers(data)
    setShowNewDm(true)
  }

  const handleStartDm = async (targetUser: UserItem) => {
    const room = await startDm(targetUser.id)
    setShowNewDm(false)
    onRoomSelect(room)
  }

  const filtered = rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
  const filteredDms = dms.filter((d) => {
    const other = d.members?.find((m) => m.user.id !== user?.id)
    return other?.user.username.toLowerCase().includes(search.toLowerCase())
  })
  const filteredUsers = users.filter((u) => u.username.toLowerCase().includes(userSearch.toLowerCase()))

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newRoomName.trim()) return
    const room = await createRoom(newRoomName.trim(), newRoomDesc.trim())
    setNewRoomName('')
    setNewRoomDesc('')
    setShowCreate(false)
    onRoomSelect(room)
  }

  const getDmName = (room: Room) => {
    const other = room.members?.find((m) => m.user.id !== user?.id)
    return other?.user.username || room.name
  }

  return (
    <aside className="w-full md:w-80 bg-[#212121] flex flex-col h-full border-r border-white/5">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-3">
          <button className="relative">
            <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.username?.[0]?.toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#212121]" />
          </button>
          <span className="text-white font-semibold text-sm">NexChat</span>
        </div>
        <div className="flex gap-1">
          {tab === 'dms' && (
            <button onClick={openNewDm} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="New DM">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          )}
          {tab === 'rooms' && (
            <button onClick={() => setShowCreate(true)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="New room">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setTab('rooms')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'rooms' ? 'text-white border-b-2 border-violet-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Rooms
        </button>
        <button
          onClick={() => setTab('dms')}
          className={`flex-1 py-2.5 text-xs font-medium transition-colors ${tab === 'dms' ? 'text-white border-b-2 border-violet-500' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Direct Messages
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 bg-[#2d2d2d] rounded-full px-3 py-2">
          <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none flex-1" />
        </div>
      </div>

      {/* Create room form */}
      {showCreate && tab === 'rooms' && (
        <form onSubmit={handleCreate} className="mx-3 mb-2 bg-[#2d2d2d] rounded-xl p-3 flex flex-col gap-2">
          <input autoFocus value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Room name" className="bg-[#3d3d3d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />
          <input value={newRoomDesc} onChange={(e) => setNewRoomDesc(e.target.value)} placeholder="Description (optional)" className="bg-[#3d3d3d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white text-xs py-2 rounded-lg transition-colors font-medium">Create</button>
            <button type="button" onClick={() => setShowCreate(false)} className="flex-1 bg-[#3d3d3d] hover:bg-[#4d4d4d] text-gray-400 text-xs py-2 rounded-lg transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* New DM modal */}
      {showNewDm && (
        <div className="mx-3 mb-2 bg-[#2d2d2d] rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-400 font-medium">Start a conversation</p>
            <button onClick={() => setShowNewDm(false)} className="text-gray-500 hover:text-gray-300">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <input autoFocus value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users..." className="bg-[#3d3d3d] rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500" />
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1 mt-1">
            {filteredUsers.map((u) => (
              <button key={u.id} onClick={() => handleStartDm(u)} className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white/10 transition-colors text-left">
                <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {u.username[0].toUpperCase()}
                </div>
                <span className="text-sm text-white">{u.username}</span>
              </button>
            ))}
            {filteredUsers.length === 0 && <p className="text-xs text-gray-600 text-center py-2">No users found</p>}
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'rooms' && (
          <>
            {filtered.length === 0 && <p className="text-center text-gray-600 text-xs mt-8">{search ? 'No rooms found' : 'No rooms yet'}</p>}
            {filtered.map((room) => {
              const isActive = activeRoom?.id === room.id
              return (
                <button key={room.id} onClick={() => onRoomSelect(room)} className={`w-full flex items-center gap-3 px-3 py-3 transition-colors ${isActive ? 'bg-violet-600/20' : 'hover:bg-white/5'}`}>
                  <RoomAvatar name={room.name} />
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${unreadCounts[room.id] > 0 && !isActive ? 'font-semibold text-white' : 'font-medium text-white'}`}>{room.name}</span>
                      {unreadCounts[room.id] > 0 && !isActive ? (
                        <span className="ml-2 min-w-[20px] h-5 bg-violet-600 rounded-full text-[11px] text-white font-semibold flex items-center justify-center px-1.5 shrink-0">
                          {unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id]}
                        </span>
                      ) : room._count ? (
                        <span className="text-[11px] text-gray-500 shrink-0 ml-2">{room._count.members}</span>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{room.description || `# ${room.name}`}</p>
                  </div>
                </button>
              )
            })}
          </>
        )}

        {tab === 'dms' && (
          <>
            {filteredDms.length === 0 && <p className="text-center text-gray-600 text-xs mt-8">{search ? 'No conversations found' : 'No direct messages yet'}</p>}
            {filteredDms.map((dm) => {
              const isActive = activeRoom?.id === dm.id
              const dmName = getDmName(dm)
              return (
                <button key={dm.id} onClick={() => onRoomSelect(dm)} className={`w-full flex items-center gap-3 px-3 py-3 transition-colors ${isActive ? 'bg-violet-600/20' : 'hover:bg-white/5'}`}>
                  <div className="relative">
                    <RoomAvatar name={dmName} />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#212121]" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm truncate ${unreadCounts[dm.id] > 0 && !isActive ? 'font-semibold text-white' : 'font-medium text-white'}`}>{dmName}</span>
                      {unreadCounts[dm.id] > 0 && !isActive && (
                        <span className="ml-2 min-w-[20px] h-5 bg-violet-600 rounded-full text-[11px] text-white font-semibold flex items-center justify-center px-1.5 shrink-0">
                          {unreadCounts[dm.id] > 99 ? '99+' : unreadCounts[dm.id]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {(dm.messages as { content: string }[] | undefined)?.[0]?.content || 'Start a conversation'}
                    </p>
                  </div>
                </button>
              )
            })}
          </>
        )}
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
        <button onClick={logout} className="text-xs text-gray-600 hover:text-red-400 transition-colors shrink-0 ml-2" title="Sign out">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
