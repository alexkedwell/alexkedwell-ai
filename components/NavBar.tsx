'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Avatar } from './Avatar'
import { ChevronDown, LogOut, User, CreditCard, MessageSquare, Users, Plus, BookOpen, Cpu } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

interface NavBarProps {
  session: Session | null
  profile?: Profile | null
  balance?: number
  centerContent?: React.ReactNode
  onBalanceUpdate?: (b: number) => void
}

export function NavBar({ session, profile, balance, centerContent }: NavBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const displayBalance = typeof balance === 'number' ? balance.toFixed(2) : null
  const isLow = typeof balance === 'number' && balance < 2

  return (
    <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 flex-shrink-0 h-12 gap-1">
      {/* Left: Logo */}
      <Link href="/" className="text-sm font-semibold text-white/60 tracking-wide hover:text-white/90 transition-colors">
        Ched
      </Link>

      {/* Center: custom content (model dropdown, etc.) */}
      <div className="flex-1 flex justify-center">
        {centerContent}
      </div>

      {/* Right: balance + avatar */}
      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
        {/* Nav links — mobile shows only Chat/Rooms/Credits icons, desktop shows all with labels */}
        <div className="flex items-center gap-0.5 sm:gap-1 mr-1 sm:mr-2">
          <Link
            href="/"
            className={`flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 sm:gap-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === '/' ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chat</span>
          </Link>
          <Link
            href="/rooms"
            className={`hidden sm:flex items-center justify-center sm:w-auto sm:px-2.5 sm:gap-1.5 rounded-lg text-xs font-medium h-8 transition-colors ${
              pathname.startsWith('/rooms') ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rooms</span>
          </Link>
          <Link
            href="/credits"
            className={`flex items-center justify-center w-8 h-8 sm:w-auto sm:px-2.5 sm:gap-1.5 rounded-lg text-xs font-medium transition-colors ${
              pathname === '/credits' ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Credits</span>
          </Link>
          {/* Models + Guide — hidden on mobile, in avatar dropdown instead */}
          <Link
            href="/models"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium h-8 transition-colors ${
              pathname === '/models' ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Models
          </Link>
          <Link
            href="/instructions"
            className={`hidden sm:flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-medium h-8 transition-colors ${
              pathname === '/instructions' ? 'bg-white/10 text-white/90' : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            Guide
          </Link>
        </div>

        {/* Credit balance */}
        {displayBalance !== null && (
          <Link
            href="/credits"
            className={`text-xs font-mono px-2.5 py-1 rounded-lg border transition-colors ${
              isLow
                ? 'text-amber-400 bg-amber-400/10 border-amber-400/20 hover:bg-amber-400/20'
                : 'text-white/50 bg-white/5 border-white/10 hover:bg-white/10'
            }`}
          >
            ${displayBalance}
          </Link>
        )}

        {/* Avatar dropdown */}
        {session && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(o => !o)}
              className="flex items-center gap-1.5 rounded-lg p-1 hover:bg-white/5 transition-colors"
            >
              <Avatar
                displayName={profile?.display_name}
                avatarUrl={profile?.avatar_url}
                avatarColor={profile?.avatar_color}
                size="sm"
              />
              <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#111] border border-white/10 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
                <div className="px-3 py-2 border-b border-white/5 mb-1">
                  <p className="text-xs text-white/40 truncate">{session.user.email}</p>
                </div>
                <Link
                  href="/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </Link>
                <Link
                  href="/credits"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Credits
                </Link>
                {/* Mobile-only links */}
                <div className="sm:hidden">
                  <Link
                    href="/rooms"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Rooms
                  </Link>
                  <Link
                    href="/models"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors"
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    Models
                  </Link>
                  <Link
                    href="/instructions"
                    onClick={() => setDropdownOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white/90 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Guide
                  </Link>
                </div>
                <div className="border-t border-white/5 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/50 hover:bg-white/5 hover:text-red-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
