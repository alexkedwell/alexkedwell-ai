'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { Avatar } from '@/components/Avatar'
import { Send, UserPlus, ArrowLeft, Bot } from 'lucide-react'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'

interface Message {
  id: string
  room_id: string
  user_id: string | null
  content: string
  is_ai: boolean
  created_at: string
}

interface Member {
  user_id: string
  profile?: {
    display_name?: string | null
    avatar_url?: string | null
    avatar_color?: string | null
  } | null
}

interface Room {
  id: string
  name: string
  created_by: string
}

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [room, setRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) {
        router.replace('/login')
      } else {
        fetchData(session)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [router, roomId])

  async function fetchData(s: Session) {
    const token = s.access_token
    const headers = { Authorization: `Bearer ${token}` }

    const [roomRes, messagesRes, membersRes, profileRes, creditsRes] = await Promise.all([
      fetch('/api/rooms', { headers }).then(r => r.json()),
      fetch(`/api/rooms/${roomId}/messages`, { headers }),
      fetch(`/api/rooms/${roomId}/members`, { headers }),
      fetch('/api/profile', { headers }),
      fetch('/api/credits', { headers }),
    ])

    const rooms: Room[] = Array.isArray(roomRes) ? roomRes : []
    const foundRoom = rooms.find(r => r.id === roomId)
    if (!foundRoom) {
      router.replace('/rooms')
      return
    }
    setRoom(foundRoom)

    if (messagesRes.ok) setMessages(await messagesRes.json())
    if (membersRes.ok) setMembers(await membersRes.json())
    if (profileRes.ok) setProfile(await profileRes.json())
    if (creditsRes.ok) {
      const c = await creditsRes.json()
      setBalance(c.balance ?? 0)
    }
    setLoading(false)
  }

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px'
  }, [input])

  async function sendMessage() {
    const content = input.trim()
    if (!content || sending || !session) return

    setInput('')
    setSending(true)

    try {
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content }),
      })
    } catch {
      // Realtime will update
    } finally {
      setSending(false)
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!session || !inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg('')

    try {
      const res = await fetch(`/api/rooms/${roomId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to invite')
      setInviteMsg('Invited successfully!')
      setInviteEmail('')
      // Refresh members
      const membersRes = await fetch(`/api/rooms/${roomId}/members`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (membersRes.ok) setMembers(await membersRes.json())
    } catch (err) {
      setInviteMsg(err instanceof Error ? err.message : 'Error inviting user')
    } finally {
      setInviting(false)
    }
  }

  function getMemberProfile(userId: string | null) {
    if (!userId) return null
    return members.find(m => m.user_id === userId)?.profile ?? null
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

      {/* Room header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0">
        <Link href="/rooms" className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white/90 truncate">{room?.name}</h2>
          <p className="text-xs text-white/30">{members.length} member{members.length !== 1 ? 's' : ''} · @ched for AI</p>
        </div>
        <button
          onClick={() => setShowInvite(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:bg-white/10 hover:text-white/70 transition-all"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Invite
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="px-4 py-3 border-b border-white/5 bg-[#1f1f1f]">
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="Invite by email address"
              className="flex-1 bg-[#2f2f2f] border border-white/10 rounded-xl px-3 py-2 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
            />
            <button
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2 bg-white text-black font-medium text-sm rounded-xl hover:bg-white/90 disabled:opacity-40 transition-all"
            >
              {inviting ? '…' : 'Invite'}
            </button>
          </form>
          {inviteMsg && (
            <p className={`text-xs mt-2 ${inviteMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>
              {inviteMsg}
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-white/20 text-sm">
            No messages yet. Say something! (Use @ched to get AI help)
          </div>
        )}
        {messages.map(msg => {
          const isOwn = msg.user_id === session?.user.id && !msg.is_ai
          const memberProfile = getMemberProfile(msg.user_id)

          return (
            <div key={msg.id} className={`flex gap-2.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {!isOwn && (
                msg.is_ai ? (
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                ) : (
                  <Avatar
                    displayName={memberProfile?.display_name}
                    avatarUrl={memberProfile?.avatar_url}
                    avatarColor={memberProfile?.avatar_color}
                    size="sm"
                  />
                )
              )}
              <div className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isOwn && (
                  <span className="text-xs text-white/30 px-1">
                    {msg.is_ai ? 'Ched AI' : (memberProfile?.display_name || 'User')}
                  </span>
                )}
                <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                  isOwn
                    ? 'bg-[#2f2f2f] text-white/90 rounded-br-sm'
                    : msg.is_ai
                    ? 'bg-indigo-500/10 border border-indigo-500/20 text-white/85 rounded-bl-sm'
                    : 'bg-[#252525] text-white/80 rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-xs text-white/20 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-5 pt-2 flex-shrink-0 border-t border-white/5">
        <div className="flex items-end gap-2 bg-[#2f2f2f] rounded-2xl px-4 py-2.5 border border-white/10 focus-within:border-white/20 transition-colors">
          <textarea
            ref={textareaRef}
            className="flex-1 bg-transparent text-sm resize-none focus:outline-none text-white/90 placeholder-white/30 min-h-[22px] max-h-[150px] leading-relaxed"
            placeholder="Message the room… (@ched for AI)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            rows={1}
            disabled={sending}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-7 h-7 rounded-full bg-white flex items-center justify-center disabled:opacity-20 hover:bg-white/90 transition-all flex-shrink-0"
          >
            <Send className="w-3 h-3 text-black" />
          </button>
        </div>
      </div>
    </div>
  )
}
