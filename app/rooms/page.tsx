'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { Users, Plus, ChevronRight, MessageSquare } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Room {
  id: string
  name: string
  created_by: string
  created_at: string
}

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

export default function RoomsPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) {
        router.replace('/login')
      } else {
        fetchData(session)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function fetchData(s: Session) {
    const [roomsRes, profileRes, creditsRes] = await Promise.all([
      fetch('/api/rooms', { headers: { Authorization: `Bearer ${s.access_token}` } }),
      fetch('/api/profile', { headers: { Authorization: `Bearer ${s.access_token}` } }),
      fetch('/api/credits', { headers: { Authorization: `Bearer ${s.access_token}` } }),
    ])
    if (roomsRes.ok) setRooms(await roomsRes.json())
    if (profileRes.ok) setProfile(await profileRes.json())
    if (creditsRes.ok) {
      const c = await creditsRes.json()
      setBalance(c.balance ?? 0)
    }
  }

  async function handleCreateRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !newRoomName.trim()) return
    setCreating(true)
    setError('')

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: newRoomName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create room')
      setRooms(prev => [data, ...prev])
      setNewRoomName('')
      setShowCreate(false)
      router.push(`/rooms/${data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating room')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <NavBar session={session} profile={profile} balance={balance} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-white/40" />
              <h1 className="text-lg font-semibold text-white/90">Group Chats</h1>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white/90 transition-all"
            >
              <Plus className="w-4 h-4" />
              New room
            </button>
          </div>

          {/* Create room form */}
          {showCreate && (
            <form onSubmit={handleCreateRoom} className="mb-6 bg-[#1f1f1f] border border-white/10 rounded-2xl p-5">
              <h3 className="text-sm font-medium text-white/70 mb-4">Create a room</h3>
              <input
                type="text"
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                placeholder="Room name (e.g. Team Chat)"
                autoFocus
                className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors mb-3"
              />
              {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2 mb-3">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creating || !newRoomName.trim()}
                  className="flex-1 bg-white text-black font-medium text-sm py-2.5 rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {creating ? 'Creating…' : 'Create room'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setError('') }}
                  className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white/50 hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Room list */}
          {rooms.length === 0 ? (
            <div className="text-center py-16">
              <MessageSquare className="w-10 h-10 text-white/15 mx-auto mb-4" />
              <p className="text-white/30 text-sm">No group chats yet.</p>
              <p className="text-white/20 text-xs mt-1">Create a room and invite friends!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.map(room => (
                <Link
                  key={room.id}
                  href={`/rooms/${room.id}`}
                  className="flex items-center gap-3 p-4 bg-[#1f1f1f] border border-white/5 rounded-2xl hover:border-white/15 hover:bg-[#252525] transition-all group"
                >
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Users className="w-4.5 h-4.5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/90 truncate">{room.name}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {new Date(room.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
