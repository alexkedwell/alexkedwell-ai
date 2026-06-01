'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Zap, ArrowRight } from 'lucide-react'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center space-y-6">

        <div>
          <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">You&apos;re almost in ⚡</h1>
          <p className="text-white/40 text-sm mt-2">Add credits to start chatting with any AI model.</p>
        </div>

        <button
          onClick={() => router.push('/credits')}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition-all text-sm"
        >
          Add credits to get started
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-white/20 text-xs">
          Credits never expire · All major cards · Apple Pay · Google Pay
        </p>
      </div>
    </div>
  )
}
