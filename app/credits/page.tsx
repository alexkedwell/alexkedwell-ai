'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { CheckCircle, XCircle, Zap, DollarSign, Shield } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { Suspense } from 'react'

const PACKAGES = [
  {
    amount: 5,
    label: '$5',
    messages: '~18,500',
    model: 'DeepSeek V3',
    color: '#6366f1',
    description: 'Great for trying it out',
  },
  {
    amount: 10,
    label: '$10',
    messages: '~3,300',
    model: 'Claude Sonnet',
    color: '#8b5cf6',
    popular: true,
    description: 'Most popular for individuals',
  },
  {
    amount: 20,
    label: '$20',
    messages: '~37,000',
    model: 'DeepSeek V3',
    color: '#a855f7',
    description: 'Best value for regular use',
  },
  {
    amount: 50,
    label: '$50',
    messages: '~8,200',
    model: 'Claude Sonnet',
    color: '#ec4899',
    description: 'Power users & small teams',
  },
]

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

function CreditsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<number | null>(null)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

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
    const [profileRes, creditsRes] = await Promise.all([
      fetch('/api/profile', { headers: { Authorization: `Bearer ${s.access_token}` } }),
      fetch('/api/credits', { headers: { Authorization: `Bearer ${s.access_token}` } }),
    ])
    if (profileRes.ok) setProfile(await profileRes.json())
    if (creditsRes.ok) {
      const c = await creditsRes.json()
      setBalance(c.balance ?? 0)
    }
    setLoading(false)
  }

  async function handleBuy(amount: number) {
    if (!session) return
    setBuying(amount)
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ amount }),
    })
    if (res.ok) {
      const { url } = await res.json()
      window.location.href = url
    } else {
      const d = await res.json()
      alert(d.error || 'Checkout failed — try again')
      setBuying(null)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <NavBar session={session} profile={profile} balance={balance} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-10 space-y-6">

          {/* Success / canceled banners */}
          {success && (
            <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              Credits added to your account! You're good to go.
            </div>
          )}
          {canceled && (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
              <XCircle className="w-5 h-5 flex-shrink-0" />
              Payment canceled — your card was not charged.
            </div>
          )}

          {/* Header + balance */}
          <div>
            <h1 className="text-2xl font-bold text-white/90">Add Credits</h1>
            <p className="text-white/40 text-sm mt-1">Credits never expire. Use any model, any time.</p>
          </div>

          {!loading && (
            <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-indigo-400" />
                <span className="text-white/60 text-sm">Current balance</span>
              </div>
              <span className="text-white font-bold text-xl">${balance.toFixed(4)}</span>
            </div>
          )}

          {/* Packages */}
          <div className="grid grid-cols-2 gap-3">
            {PACKAGES.map(pkg => (
              <button
                key={pkg.amount}
                onClick={() => handleBuy(pkg.amount)}
                disabled={!!buying}
                className={`relative text-left bg-[#2a2a2a] border rounded-2xl p-4 transition-all hover:border-white/25 disabled:opacity-60 disabled:cursor-not-allowed ${
                  pkg.popular ? 'border-indigo-500/50' : 'border-white/10'
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2.5 left-4 text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-semibold">
                    Most popular
                  </div>
                )}
                <div className="text-2xl font-bold text-white mb-1">{pkg.label}</div>
                <div className="text-xs text-white/40 mb-3">{pkg.description}</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3 h-3" style={{ color: pkg.color }} />
                    <span className="text-xs text-white/60">{pkg.messages} {pkg.model} messages</span>
                  </div>
                </div>
                {buying === pkg.amount && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#2a2a2a]/80 rounded-2xl">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Trust signals */}
          <div className="flex items-center justify-center gap-6 text-xs text-white/25">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Secured by Stripe
            </div>
            <div>Apple Pay & Google Pay accepted</div>
            <div>Credits never expire</div>
          </div>

          {/* How it works */}
          <div className="bg-[#2a2a2a] border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="text-white/70 font-semibold text-sm">How credits work</h3>
            <div className="space-y-2 text-xs text-white/40 leading-relaxed">
              <p>• Credits are deducted per message based on which model you use. Cheap models (like DeepSeek) use very little. Premium models (like Claude Opus) use more.</p>
              <p>• A typical message + response is 500–2,000 tokens. One token ≈ one word.</p>
              <p>• Credits never expire — they sit in your account until you use them.</p>
              <p>• Payment is processed securely by Stripe. We never store your card details.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default function CreditsPage() {
  return (
    <Suspense>
      <CreditsInner />
    </Suspense>
  )
}
