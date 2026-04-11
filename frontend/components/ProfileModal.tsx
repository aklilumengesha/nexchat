'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth.store'
import api from '@/lib/api'

interface Props {
  onClose: () => void
}

export default function ProfileModal({ onClose }: Props) {
  const { user, fetchMe } = useAuthStore()
  const [username, setUsername] = useState(user?.username || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)
    try {
      await api.patch('/auth/profile', { username: username.trim(), bio: bio.trim() })
      await fetchMe()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-[#212121] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 flex flex-col gap-5">
          {/* Avatar preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-violet-600 flex items-center justify-center text-white text-3xl font-bold">
              {username[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase()}
            </div>
            <p className="text-xs text-gray-500">Avatar is generated from your username initial</p>
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-widest">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              maxLength={20}
              required
              className="bg-[#2d2d2d] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-widest">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={160}
              rows={3}
              placeholder="Tell people a little about yourself..."
              className="bg-[#2d2d2d] border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
            <p className="text-[11px] text-gray-600 text-right">{bio.length}/160</p>
          </div>

          {/* Email (read-only) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-gray-400 font-medium uppercase tracking-widest">Email</label>
            <input
              value={user?.email || ''}
              disabled
              className="bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm cursor-not-allowed"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm">
              Profile updated successfully
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-400 py-3 rounded-xl text-sm transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-medium transition-colors">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
