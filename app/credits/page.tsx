'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { CreditCard, CheckCircle, XCircle, Zap, AlertTriangle } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

const PACKAGES = [
  { amount: 5, description: 'Light usage', color: '#6366f1' },
  { amount: 10, description: 'Regular user', color: '#8b5cf6', popular: true },
  { amount: 20, description: 'Power user', color: '#a855f7' },
  { amount: 50, description: 'Heavy usage', color: '#ec4899' },
]

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

function CreditsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    if (success) setMessage({ type: 'success', text: 'Payment successful! Credits added to your account.' })
    if (canceled) setMessage({ type: 'error', text: 'Payment canceled. No charges were made.' })
  }, [searchParams])

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
    const [creditsRes, profileRes] = await Promise.all([
      fetch('/api/credits', { headers: { Authorization: `Bearer ${s.access_token}` } }),
      fetch('/api/profile', { headers: { Authorization: `Bearer ${s.access_token}` } }),
    ])
    if (creditsRes.ok) {
      const d = await creditsRes.json()
      setBalance(d.balance ?? 0)
    }
    if (profileRes.ok) {
      setProfile(await profileRes.json())
    }
  }

  async function handleCheckout(amount: number) {
    if (!session) return
    setCheckoutLoading(amount)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to start checkout' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setCheckoutLoading(null)
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
    <>
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <NavBar session={session} profile={profile} balance={balance} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-10">

          {/* Balance */}
          <div className="bg-[#1f1f1f] border border-white/10 rounded-2xl p-6 mb-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              <h2 className="text-sm font-medium text-white/50 uppercase tracking-wider">Current Balance</h2>
            </div>
            <p className="text-5xl font-bold text-white/90 font-mono">${balance.toFixed(2)}</p>
            {balance < 2 && balance > 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Running low — add credits to keep chatting
              </div>
            )}
            {balance <= 0 && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-red-400 text-sm">
                <XCircle className="w-4 h-4" />
                Add credits to continue chatting
              </div>
            )}
          </div>

          {/* Status messages */}
          {message && (
            <div className={`mb-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
              message.type === 'success'
                ? 'bg-green-400/10 border border-green-400/20 text-green-400'
                : 'bg-red-400/10 border border-red-400/20 text-red-400'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {message.text}
            </div>
          )}

          {/* Packages */}
          <h3 className="text-sm font-medium text-white/40 mb-4 uppercase tracking-wider">Add Credits</h3>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {PACKAGES.map(pkg => (
              <button
                key={pkg.amount}
                onClick={() => handleCheckout(pkg.amount)}
                disabled={checkoutLoading !== null}
                className={`relative bg-[#1f1f1f] border rounded-2xl p-5 text-left hover:border-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed group ${
                  pkg.popular ? 'border-indigo-500/40' : 'border-white/10'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs px-2.5 py-0.5 rounded-full bg-indigo-500 text-white font-medium">
                    Most Popular
                  </span>
                )}
                <div className="flex items-center justify-between mb-2">
                  <CreditCard className="w-4 h-4" style={{ color: pkg.color }} />
                  {checkoutLoading === pkg.amount && (
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  )}
                </div>
                <p className="text-2xl font-bold text-white/90">${pkg.amount}</p>
                <p className="text-xs text-white/40 mt-0.5">{pkg.description}</p>
              </button>
            ))}
          </div>

          {/* Pricing explanation */}
          <div className="bg-[#1f1f1f] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white/70 mb-3">How pricing works</h3>
            <div className="space-y-2 text-sm text-white/40">
              <p>Credits are deducted per message based on the model you use:</p>
              <ul className="mt-2 space-y-1.5">
                <li className="flex items-center justify-between">
                  <span>Gemini Flash (fastest)</span>
                  <span className="font-mono text-white/60">~$0.0001/msg</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>DeepSeek V3 (best value)</span>
                  <span className="font-mono text-white/60">~$0.001/msg</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Claude Sonnet (premium)</span>
                  <span className="font-mono text-white/60">~$0.01/msg</span>
                </li>
              </ul>
              <p className="mt-3 text-white/30">A 6.25% service fee is included in each request to keep the lights on.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

export default function CreditsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    }>
      <CreditsPageInner />
    </Suspense>
  )
}
