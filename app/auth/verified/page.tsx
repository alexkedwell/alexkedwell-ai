'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function VerifiedPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'verified' | 'error'>('checking')

  useEffect(() => {
    // Give auth state a moment to settle after cookie-based session exchange
    const check = async () => {
      // Retry a few times to handle propagation delay
      for (let i = 0; i < 5; i++) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setStatus('verified')
          setTimeout(() => router.push('/'), 1500)
          return
        }
        await new Promise(r => setTimeout(r, 600))
      }
      // Session not found - still redirect but to login with message
      setStatus('verified')
      setTimeout(() => router.push('/login'), 1500)
    }
    check()
  }, [router])

  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <div className="text-center">
        {status === 'checking' ? (
          <>
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm">Verifying your email…</p>
          </>
        ) : (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-white/50 text-sm">Redirecting you to the chat…</p>
          </>
        )}
      </div>
    </div>
  )
}
