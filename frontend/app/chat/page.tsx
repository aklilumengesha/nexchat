'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth.store'
import { useRoomsStore } from '@/store/rooms.store'
import { connectSocket } from '@/lib/socket'
import Sidebar from '@/components/Sidebar'
import ChatWindow from '@/components/ChatWindow'
import { Room } from '@/store/rooms.store'

export default function ChatPage() {
  const router = useRouter()
  const { user, token, fetchMe } = useAuthStore()
  const { fetchRooms, setActiveRoom } = useRoomsStore()

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchMe()
    fetchRooms()
    connectSocket()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoomSelect = (room: Room) => {
    setActiveRoom(room)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-950">
      <Sidebar onRoomSelect={handleRoomSelect} />
      <ChatWindow />
    </div>
  )
}
