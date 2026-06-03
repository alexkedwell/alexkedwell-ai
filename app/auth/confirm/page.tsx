'use client'
import Link from 'next/link'

/**
 * /auth/confirm — shown when email verification link is clicked
 * but the user may need to manually proceed (fallback page).
 * In practice, /auth/callback handles verification automatically.
 */
export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-semibold text-white/90 mb-2">Email Verified!</h1>
        <p className="text-sm text-white/40 mb-8">
          Your email has been confirmed. You can now sign in to your account.
        </p>
        <Link
          href="/login"
          className="inline-block w-full bg-white text-black font-medium text-sm py-3 rounded-xl hover:bg-white/90 transition-all text-center"
        >
          Go to sign in →
        </Link>
      </div>
    </div>
  )
}
