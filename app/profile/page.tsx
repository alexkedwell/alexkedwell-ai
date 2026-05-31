'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { Avatar } from '@/components/Avatar'
import { Upload, Check } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
]

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [displayName, setDisplayName] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [avatarColor, setAvatarColor] = useState('#6366f1')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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
  }, [router])

  async function fetchData(s: Session) {
    const [profileRes, creditsRes] = await Promise.all([
      fetch('/api/profile', { headers: { Authorization: `Bearer ${s.access_token}` } }),
      fetch('/api/credits', { headers: { Authorization: `Bearer ${s.access_token}` } }),
    ])

    if (profileRes.ok) {
      const p = await profileRes.json()
      setProfile(p)
      setDisplayName(p.display_name ?? '')
      setAvatarColor(p.avatar_color ?? '#6366f1')
      setAvatarUrl(p.avatar_url ?? null)
      setOpenrouterKey(p.openrouter_api_key ?? '')
    }
    if (creditsRes.ok) {
      const c = await creditsRes.json()
      setBalance(c.balance ?? 0)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !session) return

    setUploading(true)
    setError('')

    try {
      const ext = file.name.split('.').pop()
      const path = `${session.user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          avatar_url: avatarUrl,
          avatar_color: avatarColor,
          openrouter_api_key: openrouterKey.trim() || null,
        }),
      })

      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to save')
      }

      const p = await res.json()
      setProfile(p)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <NavBar session={session} profile={profile} balance={balance} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-10">
          <h1 className="text-xl font-semibold text-white/90 mb-8">Profile</h1>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Avatar preview */}
            <div className="flex flex-col items-center gap-4">
              <Avatar
                displayName={displayName || session?.user.email}
                avatarUrl={avatarUrl}
                avatarColor={avatarColor}
                size="lg"
              />

              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:bg-white/10 hover:text-white/90 transition-all disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading…' : 'Upload photo'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Color picker */}
            {!avatarUrl && (
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">Avatar color</label>
                <div className="flex gap-2 flex-wrap">
                  {AVATAR_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: color }}
                    >
                      {avatarColor === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Display name */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>

            {/* OpenRouter API Key (BYOK) */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">
                OpenRouter API Key
                <span className="ml-2 text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-semibold">BYOK</span>
              </label>
              <p className="text-xs text-white/30 mb-2">Add your own <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">OpenRouter API key</a> to use your own credits instead of purchasing through Ched. Your messages won&apos;t be charged to your Ched balance.</p>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={openrouterKey}
                  onChange={e => setOpenrouterKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-3 pr-16 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-colors font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
              {openrouterKey && (
                <p className="text-xs text-green-400/70 mt-1.5">✓ BYOK active — your OpenRouter key will be used for all chats</p>
              )}
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5 font-medium">Email</label>
              <input
                type="email"
                value={session?.user.email ?? ''}
                readOnly
                className="w-full bg-[#1a1a1a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white/40 cursor-not-allowed"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-white text-black font-medium text-sm py-3 rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved!
                </>
              ) : saving ? 'Saving…' : 'Save profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
