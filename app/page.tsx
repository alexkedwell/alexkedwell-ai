'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MODELS, AIModel, DEFAULT_MODEL } from '@/lib/models'
import { Send, PenSquare, ChevronDown, Check, AlertTriangle, Zap, Brain, DollarSign } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import type { Session } from '@supabase/supabase-js'

const SUGGESTED_PROMPTS = [
  { label: 'Explain something complex', text: 'Explain something complex to me' },
  { label: 'Help me write', text: 'Help me write something' },
  { label: 'Debug my code', text: 'Debug my code and explain the issue' },
  { label: 'Compare two options', text: 'Compare two options for me' },
]

function ProviderDot({ model }: { model: AIModel }) {
  return (
    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: model.providerColor }} />
  )
}

function ProviderCircle({ model, size = 'sm' }: { model: AIModel; size?: 'sm' | 'lg' }) {
  const sizeClasses = { sm: 'w-7 h-7 text-xs', lg: 'w-14 h-14 text-xl' }
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: model.providerColor + '22', color: model.providerColor }}
    >
      {model.provider[0]}
    </div>
  )
}

interface Message { role: 'user' | 'assistant'; content: string }

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

export default function Home() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [authLoading, setAuthLoading] = useState(true)

  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auth setup
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) {
        router.replace('/login')
      } else {
        fetchUserData(session)
      }
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        router.replace('/login')
      } else {
        fetchUserData(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  async function fetchUserData(s: Session) {
    const token = s.access_token
    const [profileRes, creditsRes] = await Promise.all([
      fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/credits', { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (profileRes.ok) setProfile(await profileRes.json())
    if (creditsRes.ok) {
      const c = await creditsRes.json()
      setBalance(c.balance ?? 0)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim()
    if (!content || loading || !session) return

    if (balance <= 0) {
      router.push('/credits')
      return
    }

    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages, modelId: selectedModel.id }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        const errMsg = errData.error || `Error ${res.status}`
        setMessages(prev => {
          const updated = [...prev]
          updated[updated.length - 1] = { role: 'assistant', content: `⚠️ ${errMsg}` }
          return updated
        })
        if (res.status === 402) router.push('/credits')
        setLoading(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.replace('data: ', '')
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + parsed.text,
                }
                return updated
              })
            }
            if (typeof parsed.balance === 'number') {
              setBalance(parsed.balance)
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: '⚠️ Error connecting to model. Please try again.' }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function handleModelSelect(model: AIModel) {
    setSelectedModel(model)
    setMessages([])
    setInput('')
    setDropdownOpen(false)
  }

  function startNewChat() {
    setMessages([])
    setInput('')
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  // Model selector for center of NavBar
  const modelSelector = (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/8 bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm font-medium text-white/80 max-w-[180px] sm:max-w-none"
      >
        <ProviderDot model={selectedModel} />
        <span className="truncate">{selectedModel.name}</span>
        {selectedModel.badge && (
          <span
            className="hidden sm:inline text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
            style={{ backgroundColor: selectedModel.badgeColor + '22', color: selectedModel.badgeColor }}
          >
            {selectedModel.badge}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 flex-shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {dropdownOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-[#0d0d0d] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b border-white/5">
            <p className="text-xs text-white/30 font-medium uppercase tracking-wider">Choose Model</p>
          </div>
          <div className="overflow-y-auto max-h-[70vh] py-1.5">
          {MODELS.map(model => (
            <button
              key={model.id}
              onClick={() => handleModelSelect(model)}
              className={`w-full text-left px-3 py-2.5 transition-colors group ${
                model.id === selectedModel.id ? 'bg-white/5' : 'hover:bg-white/4'
              }`}
            >
              {/* Row 1: dot + name + badge + checkmark */}
              <div className="flex items-center gap-2 mb-1.5">
                <ProviderDot model={model} />
                <span className="flex-1 text-sm text-white/90 font-semibold">{model.name}</span>
                {model.badge && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ backgroundColor: model.badgeColor + '22', color: model.badgeColor }}
                  >
                    {model.badge}
                  </span>
                )}
                {model.id === selectedModel.id && (
                  <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: model.providerColor }} />
                )}
              </div>
              {/* Row 2: tagline */}
              <p className="text-xs text-white/35 ml-4 mb-2 leading-snug">{model.tagline}</p>
              {/* Row 3: stats */}
              <div className="flex items-center gap-3 ml-4">
                {/* Intelligence */}
                <div className="flex items-center gap-1">
                  <Brain className="w-3 h-3 text-white/20" />
                  <div className="flex gap-0.5">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: i < Math.round(model.intelligenceRating)
                            ? model.providerColor
                            : 'rgba(255,255,255,0.08)'
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Speed */}
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-white/20" />
                  <div className="flex gap-0.5">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          backgroundColor: i < Math.round(model.speedRating)
                            ? '#22c55e'
                            : 'rgba(255,255,255,0.08)'
                        }}
                      />
                    ))}
                  </div>
                </div>
                {/* Price */}
                <div className="flex items-center gap-1 ml-auto">
                  <DollarSign className="w-3 h-3 text-white/20" />
                  <span className="text-[10px] text-white/30 font-mono">
                    ${model.costPer1MInput.toFixed(2)}/${model.costPer1MOutput.toFixed(2)} /1M
                  </span>
                </div>
              </div>
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <NavBar
        session={session}
        profile={profile}
        balance={balance}
        centerContent={modelSelector}
      />

      {/* Low balance banner */}
      {balance < 2 && balance > 0 && (
        <div
          onClick={() => router.push('/credits')}
          className="flex items-center justify-center gap-2 px-4 py-1.5 bg-amber-500/10 border-b border-amber-500/15 text-amber-400 text-xs cursor-pointer hover:bg-amber-500/15 transition-colors"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Running low on credits — add more to keep chatting →
        </div>
      )}

      {/* No credits banner */}
      {balance <= 0 && (
        <div
          onClick={() => router.push('/credits')}
          className="flex items-center justify-center gap-2 px-4 py-1.5 bg-red-500/10 border-b border-red-500/15 text-red-400 text-xs cursor-pointer hover:bg-red-500/15 transition-colors"
        >
          Add credits to continue chatting →
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Chat / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center px-6 pb-16">
              <ProviderCircle model={selectedModel} size="lg" />
              <h1 className="mt-5 text-3xl font-semibold text-white/90 text-center">
                Hi, I&apos;m Ched.
              </h1>
              <p className="mt-2 text-sm text-white/40 text-center max-w-sm">
                Ask me anything — or pick a task below.
              </p>
              <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt.label}
                    onClick={() => sendMessage(prompt.text)}
                    disabled={balance <= 0}
                    className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-white/60 hover:text-white/80 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && <ProviderCircle model={selectedModel} size="sm" />}
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-[#2f2f2f] text-white/90 rounded-br-sm'
                      : 'text-white/85 rounded-bl-sm'
                  }`}>
                    {msg.content || (loading && i === messages.length - 1
                      ? <span className="inline-flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </span>
                      : ''
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="px-4 pb-6 pt-2 flex-shrink-0">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-end gap-3 bg-[#2f2f2f] rounded-3xl px-5 py-3 border border-white/10 focus-within:border-white/20 transition-colors shadow-lg">
              <textarea
                ref={textareaRef}
                className="flex-1 bg-transparent text-sm resize-none focus:outline-none text-white/90 placeholder-white/30 min-h-[24px] max-h-[200px] leading-relaxed"
                placeholder={balance <= 0 ? 'Add credits to chat…' : `Message ${selectedModel.name}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                rows={1}
                disabled={loading || balance <= 0}
              />
              <div className="flex items-center gap-1.5 flex-shrink-0 mb-0.5">
                <button
                  onClick={startNewChat}
                  title="New chat"
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/30 hover:text-white/60 transition-colors"
                >
                  <PenSquare className="w-4 h-4" />
                </button>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading || balance <= 0}
                  className="w-8 h-8 rounded-full bg-white flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
                >
                  <Send className="w-3.5 h-3.5 text-black" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
