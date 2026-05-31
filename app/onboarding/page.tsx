'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ExternalLink, Key, ArrowRight, Eye, EyeOff, CheckCircle } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

export default function OnboardingPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setSession(session)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!session) return
    const key = apiKey.trim()
    if (!key.startsWith('sk-or-')) {
      setError('That doesn\'t look right — OpenRouter keys start with sk-or-')
      return
    }
    setSaving(true)
    setError('')
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ openrouter_api_key: key }),
    })
    if (!res.ok) {
      setError('Failed to save — try again')
      setSaving(false)
      return
    }
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-1">Welcome to Ched ⚡</h1>
          <p className="text-white/40 text-sm">One quick step before you start chatting</p>
        </div>

        {/* Main card */}
        <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6">

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
              <Key className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Connect your OpenRouter account</p>
              <p className="text-white/40 text-xs">This lets you chat using your own AI credits</p>
            </div>
          </div>

          {/* What is OpenRouter */}
          <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-4 mb-6">
            <p className="text-white/70 text-sm leading-relaxed">
              Ched runs on <span className="text-indigo-400 font-semibold">OpenRouter</span> — a service that gives you access to Claude, GPT-4, Grok, DeepSeek, and 100+ AI models in one place.
              <br /><br />
              You'll need a free OpenRouter account and an API key. It takes 2 minutes.
            </p>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Get your free OpenRouter API key →
            </a>
          </div>

          {/* Steps */}
          <div className="mb-6 space-y-2">
            {[
              { n: '1', text: 'Go to openrouter.ai and create a free account' },
              { n: '2', text: 'Click "Keys" in the top menu and create a new key' },
              { n: '3', text: 'Copy it and paste it below — it starts with sk-or-' },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] text-white/40 font-bold">{s.n}</span>
                </div>
                <p className="text-white/50 text-xs leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-white/50 font-medium mb-1.5">Your OpenRouter API Key</label>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setError('') }}
                  placeholder="sk-or-v1-..."
                  className="w-full bg-[#2a2a2a] border border-white/10 rounded-xl px-4 py-3 pr-16 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-indigo-500/60 transition-colors font-mono"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
              {apiKey.startsWith('sk-or-') && (
                <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Looks good!
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={saving || !apiKey.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold text-sm py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {saving ? 'Saving…' : (
                <>
                  Start chatting
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Skip */}
        <p className="text-center text-xs text-white/25 mt-4">
          Already have an account?{' '}
          <button onClick={() => router.replace('/')} className="text-white/40 hover:text-white/60 underline transition-colors">
            Skip for now
          </button>
          {' '}(you can add credits instead)
        </p>
      </div>
    </div>
  )
}
