'use client'

import { useEffect, useState } from 'react'
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
  const { fetchRooms, setActiveRoom, activeRoom } = useRoomsStore()
  const fetchDms = useRoomsStore((s) => s.fetchDms)
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    if (!token) {
      router.push('/login')
      return
    }
    fetchMe()
    fetchRooms()
    fetchDms()
    connectSocket()
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRoomSelect = (room: Room) => {
    setActiveRoom(room)
    setShowSidebar(false) // on mobile, hide sidebar when room selected
  }

  const handleBack = () => {
    setShowSidebar(true)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-violet-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[#1a1a1a]">
      {/* Sidebar — full screen on mobile when showSidebar, hidden when chat open */}
      <div className={`
        ${showSidebar ? 'flex' : 'hidden'}
        md:flex
        w-full md:w-80 flex-shrink-0
      `}>
        <Sidebar onRoomSelect={handleRoomSelect} />
      </div>

      {/* Chat — full screen on mobile when room selected */}
      <div className={`
        ${!showSidebar || activeRoom ? 'flex' : 'hidden'}
        md:flex
        flex-1 flex-col min-w-0
      `}>
        {/* Mobile back button in chat header area */}
        {activeRoom && (
          <ChatWindow onBack={handleBack} />
        )}
        {!activeRoom && (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#1a1a1a]">
            <div className="w-20 h-20 rounded-full bg-[#2d2d2d] flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-gray-400 text-base font-medium">Select a chat to start messaging</p>
          </div>
        )}
      </div>
    </div>
  )
}
