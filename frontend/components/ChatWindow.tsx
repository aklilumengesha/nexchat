'use client'

import { useEffect, useRef, useState } from 'react'
import { useRoomsStore, Message } from '@/store/rooms.store'
import { useAuthStore } from '@/store/auth.store'
import { connectSocket } from '@/lib/socket'
import api from '@/lib/api'
import { usePresenceStore } from '@/store/presence.store'
import SearchPanel from '@/components/SearchPanel'
import RoomInfoPanel from '@/components/RoomInfoPanel'

const EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

function RoomAvatar({ name }: { name: string }) {
  const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-rose-500','bg-amber-500','bg-cyan-500','bg-pink-500']
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

export default function ChatWindow({ onBack }: { onBack?: () => void }) {
  const { activeRoom, messages, fetchMessages, addMessage, updateMessage, deleteMessage, setTyping, typingUsers, incrementUnread, loadMoreMessages } = useRoomsStore()
  const { user } = useAuthStore()
  const { onlineUsers } = usePresenceStore()
  const dmName = activeRoom?.isDm
    ? activeRoom.members?.find((m) => m.user.id !== user?.id)?.user.username || activeRoom.name
    : activeRoom?.name || ''
  const [input, setInput] = useState('')
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [showRoomInfo, setShowRoomInfo] = useState(false)
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null)
  const [reactionPicker, setReactionPicker] = useState<string | null>(null)
  const [msgReactions, setMsgReactions] = useState<Record<string, { emoji: string; count: number }[]>>({})
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [contextMenu, setContextMenu] = useState<{ msgId: string; x: number; y: number } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const skipRef = useRef(0)
  const typingTimeout = useRef<NodeJS.Timeout | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!activeRoom) return
    const socket = connectSocket()
    fetchMessages(activeRoom.id)
    skipRef.current = 50
    setHasMore(true)
    socket.emit('room:join', { roomId: activeRoom.id })
    api.get(`/rooms/${activeRoom.id}`).then((res) => {
      setMemberCount(res.data.members?.length ?? null)
    }).catch(() => {})

    socket.on('message:new', (msg: Message) => {
      if (msg.roomId === activeRoom.id) {
        addMessage(msg)
      } else {
        incrementUnread(msg.roomId)
        // Update browser tab title
        if (typeof document !== 'undefined') {
          document.title = `(${msg.user.username}) NexChat`
          setTimeout(() => { document.title = 'NexChat — Real-time Chat' }, 3000)
        }
      }
    })
    socket.on('message:edited', (msg: Message) => {
      updateMessage(msg)
    })
    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      deleteMessage(messageId)
    })
    socket.on('reaction:updated', ({ messageId, reactions }: { messageId: string; reactions: { emoji: string; count: number }[] }) => {
      setMsgReactions((prev) => ({ ...prev, [messageId]: reactions }))
    })
    socket.on('typing:start', ({ roomId, username }: { roomId: string; username: string }) => {
      if (roomId === activeRoom.id && username !== user?.username) setTyping(roomId, username, true)
    })
    socket.on('typing:stop', ({ roomId, username }: { roomId: string; username: string }) => {
      setTyping(roomId, username, false)
    })

    return () => {
      socket.emit('room:leave', { roomId: activeRoom.id })
      socket.off('message:new')
      socket.off('message:edited')
      socket.off('message:deleted')
      socket.off('reaction:updated')
      socket.off('typing:start')
      socket.off('typing:stop')
    }
  }, [activeRoom?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
      setReactionPicker(null)
      setContextMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sendMessage = () => {
    if (!input.trim() || !activeRoom) return
    const socket = connectSocket()
    socket.emit('message:send', {
      roomId: activeRoom.id,
      content: input.trim(),
      replyToId: replyTo?.id || undefined,
    })
    setInput('')
    setReplyTo(null)
    socket.emit('typing:stop', { roomId: activeRoom.id })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
    if (!activeRoom) return
    const socket = connectSocket()
    socket.emit('typing:start', { roomId: activeRoom.id })
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => socket.emit('typing:stop', { roomId: activeRoom.id }), 2000)
  }

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    if (msg.user.id !== user?.id) return
    e.preventDefault()
    setContextMenu({ msgId: msg.id, x: e.clientX, y: e.clientY })
  }

  const startEdit = (msg: Message) => {
    setEditingId(msg.id)
    setEditContent(msg.content)
    setContextMenu(null)
  }

  const submitEdit = (messageId: string) => {
    if (!editContent.trim() || !activeRoom) return
    const socket = connectSocket()
    socket.emit('message:edit', { messageId, content: editContent.trim(), roomId: activeRoom.id })
    setEditingId(null)
    setEditContent('')
  }

  const handleDelete = (messageId: string) => {    if (!activeRoom) return
    const socket = connectSocket()
    socket.emit('message:delete', { messageId, roomId: activeRoom.id })
    setContextMenu(null)
  }

  const loadMore = async () => {
    if (!activeRoom || loadingMore || !hasMore) return
    setLoadingMore(true)
    const container = scrollContainerRef.current
    const prevScrollHeight = container?.scrollHeight || 0
    try {
      const { data } = await api.get(`/rooms/${activeRoom.id}/messages?take=50&skip=${skipRef.current}`)
      if (data.length === 0) {
        setHasMore(false)
      } else {
        loadMoreMessages([...data].reverse())
        skipRef.current += data.length
        // Restore scroll position after prepend
        requestAnimationFrame(() => {
          if (container) {
            container.scrollTop = container.scrollHeight - prevScrollHeight
          }
        })
      }
    } catch { /* ignore */ } finally {
      setLoadingMore(false)
    }
  }

  const handleScroll = () => {
    const container = scrollContainerRef.current
    if (container && container.scrollTop < 80 && hasMore && !loadingMore) {
      loadMore()
    }
  }

  const jumpToMessage = (messageId: string) => {    const el = msgRefs.current[messageId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('bg-violet-500/10')
      setTimeout(() => el.classList.remove('bg-violet-500/10'), 2000)
    }
  }

  const toggleReaction = (messageId: string, emoji: string) => {    if (!activeRoom) return
    const socket = connectSocket()
    const existing = msgReactions[messageId]?.find((r) => r.emoji === emoji)
    socket.emit(existing ? 'reaction:remove' : 'reaction:add', { messageId, emoji, roomId: activeRoom.id })
    setReactionPicker(null)
  }

  const typing = activeRoom ? (typingUsers[activeRoom.id] || []) : []

  if (!activeRoom) return null

  return (
    <div className="flex-1 flex flex-col bg-[#1a1a1a] h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#212121] border-b border-white/5">
        <div className="flex items-center gap-3">
          {/* Mobile back button */}
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors mr-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <RoomAvatar name={dmName} />
          <div>
            <h2 className="text-white font-semibold text-sm leading-tight">{dmName}</h2>
            <p className="text-xs text-gray-500 leading-tight">
              {activeRoom.isDm
                ? (onlineUsers.has(activeRoom.members?.find(m => m.user.id !== user?.id)?.user.id || '') ? '🟢 online' : 'offline')
                : memberCount !== null
                  ? `${memberCount} members`
                  : activeRoom.description || 'Group'
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 relative" ref={menuRef}>
          <button onClick={() => setShowSearch(!showSearch)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-10 w-44 bg-[#2d2d2d] rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50">
              <button
                onClick={() => { setShowRoomInfo(true); setShowMenu(false) }}
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                Room Info
              </button>
              <button
                onClick={() => { setShowRoomInfo(true); setShowMenu(false) }}
                className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                Members
              </button>
              <div className="border-t border-white/10" />
              <button
                onClick={() => { setShowRoomInfo(true); setShowMenu(false) }}
                className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition-colors"
              >
                Leave Room
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1"
      >
        {/* Load more indicator */}
        {loadingMore && (
          <div className="flex justify-center py-3">
            <div className="w-4 h-4 rounded-full border-2 border-gray-700 border-t-violet-500 animate-spin" />
          </div>
        )}
        {!hasMore && messages.length > 0 && (
          <p className="text-center text-[11px] text-gray-600 py-2">Beginning of conversation</p>
        )}
        {messages.map((msg, i) => {
          const isOwn = msg.user.id === user?.id
          const prevMsg = messages[i - 1]
          const nextMsg = messages[i + 1]
          const showDateSep = !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt)
          const isFirstInGroup = !prevMsg || prevMsg.user.id !== msg.user.id || showDateSep
          const isLastInGroup = !nextMsg || nextMsg.user.id !== msg.user.id || !isSameDay(msg.createdAt, nextMsg?.createdAt)
          const reactions = msgReactions[msg.id] || []

          return (
            <div key={msg.id}>
              {showDateSep && (
                <div className="flex items-center justify-center my-4">
                  <span className="bg-[#2d2d2d] text-gray-400 text-xs px-3 py-1 rounded-full">
                    {formatDateSeparator(msg.createdAt)}
                  </span>
                </div>
              )}

              <div
                key={msg.id}
                ref={(el) => { msgRefs.current[msg.id] = el }}
                className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'} relative transition-colors duration-500 rounded-xl`}
                onMouseEnter={() => setHoveredMsg(msg.id)}
                onMouseLeave={() => setHoveredMsg(null)}
                onContextMenu={(e) => handleContextMenu(e, msg)}
              >
                {!isOwn && (
                  <div className="w-7 shrink-0">
                    {isLastInGroup && (
                      <div className="relative w-7 h-7">
                        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-white text-xs font-semibold">
                          {msg.user.username[0].toUpperCase()}
                        </div>
                        {onlineUsers.has(msg.user.id) && (
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-[#1a1a1a]" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && isFirstInGroup && (
                    <span className="text-xs font-medium text-violet-400 mb-1 ml-3">{msg.user.username}</span>
                  )}

                  <div className="relative">
                    {/* Reaction trigger */}
                    {hoveredMsg === msg.id && (
                      <div className={`absolute top-1/2 -translate-y-1/2 ${isOwn ? '-left-16' : '-right-16'} flex gap-1 z-10`}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setReplyTo(msg); setReactionPicker(null) }}
                          className="w-6 h-6 rounded-full bg-[#2d2d2d] border border-white/10 flex items-center justify-center hover:bg-[#3d3d3d] transition-colors"
                          title="Reply"
                        >
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setReactionPicker(reactionPicker === msg.id ? null : msg.id) }}
                          className="w-6 h-6 rounded-full bg-[#2d2d2d] border border-white/10 flex items-center justify-center text-xs hover:bg-[#3d3d3d] transition-colors"
                        >
                          😊
                        </button>
                      </div>
                    )}

                    {/* Emoji picker */}
                    {reactionPicker === msg.id && (
                      <div
                        className={`absolute ${isOwn ? 'right-0' : 'left-0'} -top-12 bg-[#2d2d2d] border border-white/10 rounded-2xl px-2 py-1.5 flex gap-1 z-20 shadow-xl`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {EMOJIS.map((emoji) => (
                          <button key={emoji} onClick={() => toggleReaction(msg.id, emoji)} className="text-lg hover:scale-125 transition-transform">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`px-3 py-2 text-sm leading-relaxed ${
                      isOwn
                        ? `bg-violet-600 text-white ${isFirstInGroup ? 'rounded-t-2xl' : 'rounded-2xl'} ${isLastInGroup ? 'rounded-bl-2xl rounded-br-sm' : 'rounded-2xl'}`
                        : `bg-[#2d2d2d] text-gray-100 ${isFirstInGroup ? 'rounded-t-2xl' : 'rounded-2xl'} ${isLastInGroup ? 'rounded-br-2xl rounded-bl-sm' : 'rounded-2xl'}`
                    }`}>
                      {/* Reply quote */}
                      {msg.replyTo && (
                        <div className={`mb-2 pl-2 border-l-2 ${isOwn ? 'border-violet-300' : 'border-violet-500'} rounded-sm`}>
                          <p className={`text-[11px] font-semibold ${isOwn ? 'text-violet-200' : 'text-violet-400'}`}>
                            {msg.replyTo.user.username}
                          </p>
                          <p className={`text-[11px] truncate ${isOwn ? 'text-violet-200' : 'text-gray-400'}`}>
                            {msg.replyTo.content}
                          </p>
                        </div>
                      )}
                      {editingId === msg.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            autoFocus
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitEdit(msg.id)
                              if (e.key === 'Escape') { setEditingId(null) }
                            }}
                            className="bg-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none w-full"
                          />
                          <div className="flex gap-2 text-[11px]">
                            <button onClick={() => submitEdit(msg.id)} className="text-green-300 hover:text-green-200">Save</button>
                            <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-300">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {msg.content}
                          <span className={`text-[10px] ml-2 float-right mt-1 ${isOwn ? 'text-violet-200' : 'text-gray-500'}`}>
                            {msg.updatedAt && msg.updatedAt !== msg.createdAt && <span className="mr-1 italic">edited</span>}
                            {formatTime(msg.createdAt)}
                            {isOwn && <span className="ml-1">✓✓</span>}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Reactions */}
                    {reactions.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        {reactions.map((r) => (
                          <button
                            key={r.emoji}
                            onClick={() => toggleReaction(msg.id, r.emoji)}
                            className="flex items-center gap-1 bg-[#2d2d2d] border border-white/10 rounded-full px-2 py-0.5 text-xs hover:bg-[#3d3d3d] transition-colors"
                          >
                            <span>{r.emoji}</span>
                            <span className="text-gray-400">{r.count}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {typing.length > 0 && (
          <div className="flex items-end gap-2 mt-2">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-white text-xs shrink-0">
              {typing[0][0].toUpperCase()}
            </div>
            <div className="bg-[#2d2d2d] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              {[0,1,2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-[#2d2d2d] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 w-40"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => { const msg = messages.find(m => m.id === contextMenu.msgId); if (msg) startEdit(msg) }}
            className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <div className="border-t border-white/10" />
          <button
            onClick={() => handleDelete(contextMenu.msgId)}
            className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-[#212121] border-t border-white/5">
        {/* Reply preview */}
        {replyTo && (
          <div className="flex items-center gap-2 mb-2 bg-[#2d2d2d] rounded-xl px-3 py-2">
            <div className="w-0.5 h-8 bg-violet-500 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-violet-400">{replyTo.user.username}</p>
              <p className="text-xs text-gray-400 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-500 hover:text-gray-300 shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <div className="flex-1 bg-[#2d2d2d] rounded-full px-4 py-2.5">
            <input
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Message"
              className="w-full bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
            />
          </div>
          <button
            onClick={sendMessage}
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all ${
              input.trim() ? 'bg-violet-600 hover:bg-violet-700 text-white' : 'bg-[#2d2d2d] text-gray-500'
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

      {/* Search panel */}
      {showSearch && activeRoom && (
        <SearchPanel
          roomId={activeRoom.id}
          onClose={() => setShowSearch(false)}
          onJumpTo={jumpToMessage}
        />
      )}

      {/* Room info panel */}
      {showRoomInfo && activeRoom && !activeRoom.isDm && (
        <RoomInfoPanel
          roomId={activeRoom.id}
          roomName={activeRoom.name}
          roomDescription={activeRoom.description}
          createdBy={activeRoom.createdBy}
          onClose={() => setShowRoomInfo(false)}
          onLeave={() => {
            useRoomsStore.getState().fetchRooms()
          }}
        />
      )}
    </div>
  )
}
