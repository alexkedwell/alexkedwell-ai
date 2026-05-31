'use client'
import { useState, useRef, useEffect } from 'react'
import { MODELS, AIModel, DEFAULT_MODEL } from '@/lib/models'
import { Send, PenSquare, ChevronDown, Check } from 'lucide-react'

const SUGGESTED_PROMPTS = [
  { label: 'Explain something complex', text: 'Explain something complex to me' },
  { label: 'Help me write', text: 'Help me write something' },
  { label: 'Debug my code', text: 'Debug my code and explain the issue' },
  { label: 'Compare two options', text: 'Compare two options for me' },
]

function ProviderDot({ model, size = 'sm' }: { model: AIModel; size?: 'sm' | 'lg' }) {
  const sizeClasses = { sm: 'w-2.5 h-2.5', lg: 'w-14 h-14 text-xl font-bold' }
  if (size === 'lg') {
    return (
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0"
        style={{ backgroundColor: model.providerColor + '22', color: model.providerColor }}
      >
        {model.provider[0]}
      </div>
    )
  }
  return (
    <div
      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: model.providerColor }}
    />
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

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [input])

  // Close dropdown on outside click
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
    if (!content || loading) return
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, modelId: selectedModel.id }),
      })

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
                updated[updated.length - 1] = { role: 'assistant', content: updated[updated.length - 1].content + parsed.text }
                return updated
              })
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

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0 h-12">

        {/* Left: site name */}
        <span className="text-sm font-semibold text-white/60 tracking-wide">Ched</span>

        {/* Center: model selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/8 bg-white/5 border border-white/10 hover:border-white/20 transition-all text-sm font-medium text-white/80"
          >
            <ProviderDot model={selectedModel} />
            <span>{selectedModel.name}</span>
            {selectedModel.badge && (
              <span
                className="text-xs px-1.5 py-0.5 rounded font-medium"
                style={{ backgroundColor: selectedModel.badgeColor + '22', color: selectedModel.badgeColor }}
              >
                {selectedModel.badge}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {dropdownOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-[#111111] border border-white/10 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden">
              {MODELS.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className="w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors group"
                >
                  <ProviderDot model={model} />
                  <span className="flex-1 text-sm text-white/80 font-medium">{model.name}</span>
                  <span className="text-xs text-white/30">{model.provider}</span>
                  {model.badge && (
                    <span
                      className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: model.badgeColor + '22', color: model.badgeColor }}
                    >
                      {model.badge}
                    </span>
                  )}
                  {model.id === selectedModel.id && (
                    <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: model.providerColor }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: new chat button */}
        <button
          onClick={startNewChat}
          title="New chat"
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          <PenSquare className="w-4 h-4" />
        </button>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-h-0">

        {/* Chat / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            // Welcome screen
            <div className="h-full flex flex-col items-center justify-center px-6 pb-16">
              <ProviderCircle model={selectedModel} size="lg" />
              <h1 className="mt-5 text-3xl font-semibold text-white/90 text-center">
                Hi, I&apos;m Ched.
              </h1>
              <p className="mt-2 text-sm text-white/40 text-center max-w-sm">
                Ask me anything — or pick a task below.
              </p>
              {/* Prompt chips */}
              <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-lg">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt.label}
                    onClick={() => sendMessage(prompt.text)}
                    className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-white/60 hover:text-white/80 transition-all"
                  >
                    {prompt.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages
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
                      ? <span className="inline-flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} /><span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} /></span>
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
                placeholder={`Message ${selectedModel.name}…`}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                rows={1}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-full bg-white flex items-center justify-center disabled:opacity-20 disabled:cursor-not-allowed hover:bg-white/90 transition-all flex-shrink-0 mb-0.5"
              >
                <Send className="w-3.5 h-3.5 text-black" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
