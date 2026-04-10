'use client'

import { useEffect, useRef, useState } from 'react'
import { useRoomsStore, Message } from '@/store/rooms.store'
import { useAuthStore } from '@/store/auth.store'
import { connectSocket } from '@/lib/socket'
import api from '@/lib/api'

function RoomAvatar({ name }: { name: string }) {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-rose-500', 'bg-amber-500', 'bg-cyan-500', 'bg-pink-500',
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-9 h-9 ${color} rounded-full flex items-center justify-center font-semibold text-white text-sm shrink-0`}>
      {name[0]?.toUpperCase()}
    </div>
  )
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateSeparator(date: string) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })
}

function isSameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

export default function ChatWindow() {
  const { activeRoom, messages, fetchMessages, addMessage, setTyping, typingUsers } = useRoomsStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeRoom) return
    const socket = connectSocket()

    fetchMessages(activeRoom.id)
    socket.emit('room:join', { roomId: activeRoom.id })

    // Fetch member count
    api.get(`/rooms/${activeRoom.id}`).then((res) => {
      setMemberCount(res.data.members?.length ?? null)
    }).catch(() => {})

    socket.on('message:new', (msg: Message) => {
      if (msg.roomId === activeRoom.id) addMessage(msg)
    })

    socket.on('typing:start', ({ roomId, username }: { roomId: string; username: string }) => {
      if (roomId === activeRoom.id && username !== user?.username) {
        setTyping(roomId, username, true)
      }
    })

    socket.on('typing:stop', ({ roomId, username }: { roomId: string; username: string }) => {
      setTyping(roomId, username, false)
    })

    return () => {
      socket.emit('room:leave', { roomId: activeRoom.id })
      socket.off('message:new')
      socket.off('typing:start')
      socket.off('typing:stop')
    }
  }, [activeRoom?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sendMessage = () => {
    if (!input.trim() || !activeRoom) return
    const socket = connectSocket()
    socket.emit('message:send', { roomId: activeRoom.id, content: input.trim() })
    setInput('')
    socket.emit('typing:stop', { roomId: activeRoom.id })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    if (!activeRoom) return
    const socket = connectSocket()
    socket.emit('typing:start', { roomId: activeRoom.id })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing:stop', { roomId: activeRoom.id })
    }, 2000)
  }

  const typing = activeRoom ? (typingUsers[activeRoom.id] || []) : []

  if (!activeRoom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#1a1a1a]">
        <div className="w-20 h-20 rounded-full bg-[#2d2d2d] flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-gray-400 text-base font-medium">Select a chat to start messaging</p>
        <p className="text-gray-600 text-sm mt-1">Choose from your rooms on the left</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#1a1a1a] h-full">

      {/* ── Chat Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#212121] border-b border-white/5">
        <div className="flex items-center gap-3">
          <RoomAvatar name={activeRoom.name} />
          <div>
            <h2 className="text-white font-semibold text-sm leading-tight">{activeRoom.name}</h2>
            <p className="text-xs text-gray-500 leading-tight">
              {memberCount !== null ? `${memberCount} members` : activeRoom.description || 'Group'}
            </p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 relative" ref={menuRef}>
          <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-10 w-44 bg-[#2d2d2d] rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
              <button className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                Room Info
              </button>
              <button className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors">
                Members
              </button>
              <div className="border-t border-white/10" />
              <button className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition-colors">
                Leave Room
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1">
        {messages.map((msg, i) => {
          const isOwn = msg.user.id === user?.id
          const prevMsg = messages[i - 1]
          const nextMsg = messages[i + 1]
          const showDateSep = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt)
          const isFirstInGroup = !prevMsg || prevMsg.user.id !== msg.user.id || showDateSep
          const isLastInGroup = !nextMsg || nextMsg.user.id !== msg.user.id || !isSameDay(msg.createdAt, nextMsg.createdAt)

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDateSep && (
                <div className="flex items-center justify-center my-4">
                  <span className="bg-[#2d2d2d] text-gray-400 text-xs px-3 py-1 rounded-full">
                    {formatDateSeparator(msg.createdAt)}
                  </span>
                </div>
              )}

              <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'}`}>
                {/* Avatar — only for others, only on last in group */}
                {!isOwn && (
                  <div className="w-7 shrink-0">
                    {isLastInGroup ? (
                      <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold">
                        {msg.user.username[0].toUpperCase()}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Sender name — only for others, only first in group */}
                  {!isOwn && isFirstInGroup && (
                    <span className="text-xs font-medium text-violet-400 mb-1 ml-3">
                      {msg.user.username}
                    </span>
                  )}

                  {/* Bubble */}
                  <div className={`relative px-3 py-2 text-sm leading-relaxed ${
                    isOwn
                      ? `bg-violet-600 text-white ${isFirstInGroup ? 'rounded-t-2xl' : 'rounded-2xl'} ${isLastInGroup ? 'rounded-bl-2xl rounded-br-sm' : 'rounded-2xl'}`
                      : `bg-[#2d2d2d] text-gray-100 ${isFirstInGroup ? 'rounded-t-2xl' : 'rounded-2xl'} ${isLastInGroup ? 'rounded-br-2xl rounded-bl-sm' : 'rounded-2xl'}`
                  }`}>
                    {msg.content}
                    {/* Time inside bubble */}
                    <span className={`text-[10px] ml-2 float-right mt-1 ${isOwn ? 'text-violet-200' : 'text-gray-500'}`}>
                      {formatTime(msg.createdAt)}
                      {isOwn && (
                        <span className="ml-1">✓✓</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="flex items-end gap-2 mt-2">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs shrink-0">
              {typing[0][0].toUpperCase()}
            </div>
            <div className="bg-[#2d2d2d] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div className="px-4 py-3 bg-[#212121] border-t border-white/5">
        <div className="flex items-center gap-3">
          {/* Emoji button */}
          <button className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Input */}
          <div className="flex-1 bg-[#2d2d2d] rounded-full px-4 py-2.5">
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
            />
          </div>

          {/* Send / mic button */}
          <button
            onClick={sendMessage}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
              input.trim()
                ? 'bg-violet-600 hover:bg-violet-700 text-white'
                : 'bg-[#2d2d2d] text-gray-500'
            }`}
          >
            {input.trim() ? (
              <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
