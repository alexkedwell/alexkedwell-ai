'use client'
import { useState, useRef, useEffect } from 'react'
import { MODELS, AIModel, DEFAULT_MODEL } from '@/lib/models'
import { Send, ChevronRight, PenSquare } from 'lucide-react'

const SUGGESTED_PROMPTS = [
  'Explain quantum computing in simple terms',
  'Write a cover letter for a software engineer role',
  'Debug my code and explain the issue',
  'Compare GPT-4o vs Claude Sonnet',
]

function ProviderCircle({ model, size = 'md' }: { model: AIModel; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = { sm: 'w-6 h-6 text-xs', md: 'w-8 h-8 text-sm', lg: 'w-14 h-14 text-xl' }
  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ backgroundColor: model.providerColor + '22', color: model.providerColor }}
    >
      {model.provider[0]}
    </div>
  )
}

function ModelListItem({ model, selected, onClick }: { model: AIModel; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 transition-colors group ${
        selected ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      <ProviderCircle model={model} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white/90 truncate">{model.name}</div>
        <div className="text-xs text-white/40 truncate">{model.provider}</div>
      </div>
      {model.badge && (
        <span
          className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 hidden group-hover:block"
          style={{ backgroundColor: model.badgeColor + '22', color: model.badgeColor }}
        >
          {model.badge}
        </span>
      )}
    </button>
  )
}

function ModelInfoPanel({ model }: { model: AIModel }) {
  return (
    <div className="mx-3 mb-3 p-3 bg-white/5 rounded-xl border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <ProviderCircle model={model} size="sm" />
        <div>
          <div className="text-xs font-semibold text-white">{model.name}</div>
          <div className="text-xs text-white/40">{model.provider}</div>
        </div>
        {model.badge && (
          <span className="ml-auto text-xs px-1.5 py-0.5 rounded font-medium" style={{ backgroundColor: model.badgeColor + '22', color: model.badgeColor }}>
            {model.badge}
          </span>
        )}
      </div>
      <p className="text-xs text-white/60 mb-2 leading-relaxed">{model.description}</p>
      <div className="space-y-1.5 mb-2">
        <div>
          <div className="flex justify-between mb-0.5">
            <span className="text-xs text-white/40">Intelligence</span>
            <span className="text-xs text-white/60">{model.intelligenceRating}/10</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full">
            <div className="h-1 rounded-full bg-purple-500" style={{ width: `${model.intelligenceRating * 10}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-0.5">
            <span className="text-xs text-white/40">Speed</span>
            <span className="text-xs text-white/60">{model.speedRating}/10</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full">
            <div className="h-1 rounded-full bg-blue-500" style={{ width: `${model.speedRating * 10}%` }} />
          </div>
        </div>
      </div>
      <div className="flex gap-2 text-xs text-white/40 flex-wrap">
        <span>${model.costPer1MInput}/1M in</span>
        <span>·</span>
        <span>${model.costPer1MOutput}/1M out</span>
        <span>·</span>
        <span>{model.contextWindow}</span>
      </div>
    </div>
  )
}

interface Message { role: 'user' | 'assistant'; content: string }

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedModel, setExpandedModel] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    setExpandedModel(expandedModel === model.id ? null : model.id)
  }

  function startNewChat() {
    setMessages([])
    setInput('')
  }

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-white overflow-hidden">

      {/* ── Sidebar ── */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="w-64 h-full flex flex-col bg-[#111111]">

          {/* Sidebar top */}
          <div className="p-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/80 px-1">AI Hub</span>
            <button
              onClick={startNewChat}
              title="New chat"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors"
            >
              <PenSquare className="w-4 h-4" />
            </button>
          </div>

          {/* Model list */}
          <div className="flex-1 overflow-y-auto py-1">
            <div className="px-4 py-1 text-xs text-white/30 uppercase tracking-wider font-medium">Models</div>
            {MODELS.map(model => (
              <div key={model.id}>
                <ModelListItem
                  model={model}
                  selected={model.id === selectedModel.id}
                  onClick={() => handleModelSelect(model)}
                />
                {expandedModel === model.id && <ModelInfoPanel model={model} />}
              </div>
            ))}
          </div>

          <div className="px-4 py-3 text-xs text-white/20 border-t border-white/5">
            Powered by OpenRouter
          </div>
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
          <ProviderCircle model={selectedModel} size="sm" />
          <span className="text-sm font-medium text-white/80">{selectedModel.name}</span>
        </div>

        {/* Chat / Welcome */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            // Welcome screen
            <div className="h-full flex flex-col items-center justify-center px-6 pb-16">
              <ProviderCircle model={selectedModel} size="lg" />
              <h1 className="mt-5 text-3xl font-semibold text-white/90 text-center">
                Chat with {selectedModel.name}
              </h1>
              <p className="mt-2 text-sm text-white/40 text-center max-w-sm">
                {selectedModel.tagline}
              </p>
              {/* Suggested prompts */}
              <div className="mt-10 grid grid-cols-2 gap-2 w-full max-w-xl">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="text-left px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-sm text-white/70 hover:text-white/90 transition-all leading-snug"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Messages
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
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
        <div className="px-4 pb-6 pt-2">
          <div className="max-w-3xl mx-auto">
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
