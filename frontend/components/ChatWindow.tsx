'use client'

import { useEffect, useRef, useState } from 'react'
import { useRoomsStore, Message } from '@/store/rooms.store'
import { useAuthStore } from '@/store/auth.store'
import { connectSocket } from '@/lib/socket'

export default function ChatWindow() {
  const { activeRoom, messages, fetchMessages, addMessage, setTyping, typingUsers } = useRoomsStore()
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!activeRoom) return
    const socket = connectSocket()

    fetchMessages(activeRoom.id)
    socket.emit('room:join', { roomId: activeRoom.id })

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
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 text-gray-500">
        <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
          <span className="font-mono text-2xl text-gray-600">#</span>
        </div>
        <p className="text-sm">Select a room to start chatting</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-950 h-full">
      {/* Room header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-3">
        <span className="text-gray-400 text-lg">#</span>
        <div>
          <h2 className="text-white font-semibold text-sm">{activeRoom.name}</h2>
          {activeRoom.description && (
            <p className="text-xs text-gray-500">{activeRoom.description}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.map((msg, i) => {
          const isOwn = msg.user.id === user?.id
          const showAvatar = i === 0 || messages[i - 1].user.id !== msg.user.id

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center shrink-0 ${!showAvatar ? 'invisible' : ''}`}>
                <span className="text-white text-xs font-semibold">
                  {msg.user.username[0].toUpperCase()}
                </span>
              </div>

              <div className={`flex flex-col gap-0.5 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                {showAvatar && (
                  <span className="text-xs text-gray-500 px-1">{msg.user.username}</span>
                )}
                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isOwn
                    ? 'bg-violet-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-gray-600 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span>{typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3 focus-within:border-violet-500 transition-colors">
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${activeRoom.name}`}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all shrink-0"
          >
            <svg className="w-4 h-4 text-white rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
