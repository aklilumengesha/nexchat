'use client'

import { useState, useRef } from 'react'
import api from '@/lib/api'
import { Message } from '@/store/rooms.store'

interface Props {
  roomId: string
  onClose: () => void
  onJumpTo: (messageId: string) => void
}

function highlight(text: string, query: string) {
  if (!query.trim()) return text
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-violet-500/40 text-white rounded px-0.5">{part}</mark>
      : part
  )
}

function formatTime(date: string) {
  return new Date(date).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function SearchPanel({ roomId, onClose, onJumpTo }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const search = async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return }
    setLoading(true)
    try {
      const { data } = await api.get(`/rooms/${roomId}/search?q=${encodeURIComponent(q)}`)
      setResults(data)
      setSearched(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 400)
  }

  return (
    <div className="absolute top-0 right-0 bottom-0 w-80 bg-[#212121] border-l border-white/10 flex flex-col z-30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={handleChange}
          placeholder="Search messages..."
          className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 focus:outline-none"
        />
        <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 rounded-full border-2 border-gray-700 border-t-violet-500 animate-spin" />
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No messages found</p>
            <p className="text-gray-600 text-xs mt-1">Try a different search term</p>
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-8">
            <p className="text-gray-600 text-xs">Type to search messages in this room</p>
          </div>
        )}

        {!loading && results.map((msg) => (
          <button
            key={msg.id}
            onClick={() => { onJumpTo(msg.id); onClose() }}
            className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5"
          >
            <div className="flex items-center gap-2 mb-1">
              <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center text-white text-[10px] font-semibold shrink-0">
                {msg.user.username[0].toUpperCase()}
              </div>
              <span className="text-xs font-medium text-violet-400">{msg.user.username}</span>
              <span className="text-[10px] text-gray-600 ml-auto">{formatTime(msg.createdAt)}</span>
            </div>
            <p className="text-sm text-gray-300 leading-relaxed line-clamp-2">
              {highlight(msg.content, query)}
            </p>
          </button>
        ))}

        {!loading && results.length > 0 && (
          <p className="text-center text-[11px] text-gray-600 py-3">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </p>
        )}
      </div>
    </div>
  )
}
