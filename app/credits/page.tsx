'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { ExternalLink, Key, Zap, DollarSign, RefreshCw } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
  openrouter_api_key?: string | null
}

export default function CreditsPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number | null>(null)
  const [loadingBalance, setLoadingBalance] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setSession(session)
      fetchData(session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function fetchData(s: Session) {
    const res = await fetch('/api/profile', { headers: { Authorization: `Bearer ${s.access_token}` } })
    if (res.ok) setProfile(await res.json())
  }

  async function fetchORBalance() {
    if (!profile?.openrouter_api_key) return
    setLoadingBalance(true)
    try {
      const res = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${profile.openrouter_api_key}` }
      })
      if (res.ok) {
        const d = await res.json()
        setBalance(d.data?.total_credits ?? d.credits ?? null)
      }
    } catch { /* ignore */ }
    setLoadingBalance(false)
  }

  useEffect(() => {
    if (profile?.openrouter_api_key) fetchORBalance()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const hasKey = !!(profile?.openrouter_api_key?.trim())

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <NavBar session={session} profile={profile} balance={balance ?? undefined} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-12 space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white/90">Credits & Billing</h1>
            <p className="text-white/40 text-sm mt-1">Ched runs on OpenRouter — you pay them directly, not us.</p>
          </div>

          {hasKey ? (
            <>
              {/* Current balance */}
              <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-400" />
                    <span className="text-white/70 font-medium">Your OpenRouter Balance</span>
                  </div>
                  <button
                    onClick={fetchORBalance}
                    disabled={loadingBalance}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${loadingBalance ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                {balance !== null ? (
                  <p className="text-4xl font-bold text-white">${balance.toFixed(4)}</p>
                ) : (
                  <p className="text-white/30 text-sm">{loadingBalance ? 'Loading balance…' : 'Could not fetch balance'}</p>
                )}
                <p className="text-white/30 text-xs mt-2">This balance is on your OpenRouter account and shared across all OpenRouter-powered apps you use.</p>
              </div>

              {/* Add credits CTA */}
              <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-2xl p-6 space-y-4">
                <div>
                  <h2 className="text-white font-semibold mb-1">Add more credits</h2>
                  <p className="text-white/50 text-sm">Top up your OpenRouter balance directly. Starts at $5 — no subscription required.</p>
                </div>

                {/* Cost examples */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: '$5', sub: '~18,000 DeepSeek msgs' },
                    { label: '$10', sub: '~3,300 Claude Sonnet msgs' },
                    { label: '$20', sub: '~73,000 DeepSeek msgs' },
                    { label: '$50', sub: '~16,600 Claude Sonnet msgs' },
                  ].map(item => (
                    <div key={item.label} className="bg-white/5 rounded-xl px-3 py-2.5">
                      <p className="text-white font-bold text-lg">{item.label}</p>
                      <p className="text-white/40 text-xs">{item.sub}</p>
                    </div>
                  ))}
                </div>

                <a
                  href="https://openrouter.ai/credits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all text-sm"
                >
                  Add credits on OpenRouter
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              {/* Key management */}
              <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="w-4 h-4 text-white/40" />
                  <span className="text-white/60 text-sm font-medium">Your API Key</span>
                </div>
                <p className="text-white/30 text-xs font-mono">
                  {profile?.openrouter_api_key?.slice(0, 12)}••••••••••••••••
                </p>
                <button
                  onClick={() => router.push('/profile')}
                  className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Update key in Profile →
                </button>
              </div>
            </>
          ) : (
            /* No key yet */
            <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto">
                <Key className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold mb-1">Connect your OpenRouter account first</h2>
                <p className="text-white/40 text-sm">You need a free OpenRouter API key to use Ched. It takes 2 minutes.</p>
              </div>
              <button
                onClick={() => router.push('/onboarding')}
                className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all text-sm"
              >
                <Zap className="w-4 h-4" />
                Set up my API key
              </button>
            </div>
          )}

          {/* How pricing works */}
          <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-white/70 font-semibold text-sm">How pricing works</h3>
            <div className="space-y-2 text-xs text-white/40 leading-relaxed">
              <p>• You pay <strong className="text-white/60">OpenRouter directly</strong> — Ched doesn&apos;t touch your money or take a cut.</p>
              <p>• Different models cost different amounts. DeepSeek V3 is extremely cheap (~$0.27/1M tokens). Claude Sonnet is pricier ($3.00/1M tokens) but more powerful.</p>
              <p>• OpenRouter charges per token (roughly per word). A typical conversation is 500–2,000 tokens.</p>
              <p>• Your credits never expire and work across all OpenRouter-compatible apps.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
