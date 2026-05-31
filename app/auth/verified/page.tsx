'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VerifiedPage() {
  const router = useRouter()
  useEffect(() => {
    setTimeout(() => router.push('/'), 3000)
  }, [router])
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
        <p className="text-white/50">Redirecting you to the chat...</p>
      </div>
    </div>
  )
}
