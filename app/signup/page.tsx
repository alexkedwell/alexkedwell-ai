'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: 'https://ched.io/auth/callback' }
    })
    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    if (data.session) {
      // Create profile and credits
      await Promise.allSettled([
        fetch('/api/profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${data.session.access_token}`,
          },
          body: JSON.stringify({ display_name: displayName.trim() || null }),
        }),
        fetch('/api/credits', {
          headers: { Authorization: `Bearer ${data.session.access_token}` },
        }),
      ])
    }

    router.push('/onboarding')
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-white/90">Create account</h1>
          <p className="mt-1 text-sm text-white/40">Start chatting with any AI model</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="Your name (optional)"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-3 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5 font-medium">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-[#2f2f2f] border border-white/10 rounded-xl px-4 py-3 pr-11 text-sm text-white/90 placeholder-white/30 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="Min 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium text-sm py-3 rounded-xl hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link href="/login" className="text-white/70 hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
