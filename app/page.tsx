'use client'
import { useState, useRef, useEffect } from 'react'
import { MODELS, AIModel, DEFAULT_MODEL } from '@/lib/models'
import { Send, ChevronRight, Sparkles } from 'lucide-react'

function ModelCard({ model, selected, onClick }: { model: AIModel; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all mb-2 ${
        selected
          ? 'border-blue-500 bg-blue-500/10'
          : 'border-gray-700 hover:border-gray-500 bg-gray-800/50 hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-sm text-white">{model.name}</span>
        {model.badge && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: model.badgeColor + '22', color: model.badgeColor }}>
            {model.badge}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-400 mb-2">{model.provider} · {model.tagline}</div>
      <div className="flex gap-3 text-xs text-gray-500">
        <span title="Intelligence">🧠 {model.intelligenceRating}/10</span>
        <span title="Speed">⚡ {model.speedRating}/10</span>
        <span title="Cost per 1M output tokens">${model.costPer1MOutput}/1M out</span>
      </div>
    </button>
  )
}

function ModelDetail({ model }: { model: AIModel }) {
  return (
    <div className="p-4 bg-gray-800/60 rounded-xl border border-gray-700 mb-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold" style={{ backgroundColor: model.providerColor + '22', color: model.providerColor }}>
          {model.provider[0]}
        </div>
        <div>
          <div className="font-bold text-white">{model.name}</div>
          <div className="text-sm text-gray-400">{model.provider}</div>
        </div>
        {model.badge && (
          <span className="ml-auto text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: model.badgeColor + '22', color: model.badgeColor }}>
            {model.badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-300 mb-3">{model.description}</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-gray-900/60 rounded-lg p-2">
          <div className="text-xs text-gray-500 mb-1">Intelligence</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-purple-500" style={{ width: `${model.intelligenceRating * 10}%` }} />
            </div>
            <span className="text-xs text-white font-medium">{model.intelligenceRating}/10</span>
          </div>
        </div>
        <div className="bg-gray-900/60 rounded-lg p-2">
          <div className="text-xs text-gray-500 mb-1">Speed</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-700 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${model.speedRating * 10}%` }} />
            </div>
            <span className="text-xs text-white font-medium">{model.speedRating}/10</span>
          </div>
        </div>
      </div>
      <div className="flex gap-3 text-xs text-gray-400">
        <span>📥 ${model.costPer1MInput}/1M input</span>
        <span>📤 ${model.costPer1MOutput}/1M output</span>
        <span>🪟 {model.contextWindow}</span>
      </div>
      {model.strengths.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {model.strengths.map(s => (
            <span key={s} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">{s}</span>
          ))}
        </div>
      )}
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
  const [showDetail, setShowDetail] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
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

  function handleModelChange(model: AIModel) {
    setSelectedModel(model)
    setMessages([])
    setShowDetail(true)
    setTimeout(() => setShowDetail(false), 3000)
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="w-72 h-full flex flex-col border-r border-gray-800 bg-gray-900">
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-lg">AI Hub</span>
            </div>
            <p className="text-xs text-gray-500">by alexkedwell.com</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 px-1">Choose Your Model</div>
            {MODELS.map(model => (
              <ModelCard key={model.id} model={model} selected={model.id === selectedModel.id} onClick={() => handleModelChange(model)} />
            ))}
          </div>
          <div className="p-3 border-t border-gray-800 text-xs text-gray-600 text-center">
            Powered by OpenRouter · Pay per use
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-900/50 backdrop-blur">
          <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400">
            <ChevronRight className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: selectedModel.providerColor + '33', color: selectedModel.providerColor }}>
            {selectedModel.provider[0]}
          </div>
          <div>
            <span className="font-semibold text-sm">{selectedModel.name}</span>
            <span className="text-gray-500 text-xs ml-2">· {selectedModel.tagline}</span>
          </div>
          {selectedModel.badge && (
            <span className="text-xs px-2 py-0.5 rounded-full ml-auto" style={{ backgroundColor: selectedModel.badgeColor + '22', color: selectedModel.badgeColor }}>
              {selectedModel.badge}
            </span>
          )}
        </div>

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
              {showDetail ? (
                <ModelDetail model={selectedModel} />
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mb-4" style={{ backgroundColor: selectedModel.providerColor + '22', color: selectedModel.providerColor }}>
                    {selectedModel.provider[0]}
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Chat with {selectedModel.name}</h2>
                  <p className="text-gray-400 max-w-md mb-6">{selectedModel.description}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {selectedModel.strengths.map(s => (
                      <span key={s} className="text-sm px-3 py-1.5 bg-gray-800 text-gray-300 rounded-full border border-gray-700">{s}</span>
                    ))}
                  </div>
                  <div className="mt-6 flex gap-4 text-sm text-gray-500">
                    <span>🧠 {selectedModel.intelligenceRating}/10 intelligence</span>
                    <span>⚡ {selectedModel.speedRating}/10 speed</span>
                    <span>💰 ${selectedModel.costPer1MOutput}/1M tokens</span>
                  </div>
                </>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-2 flex-shrink-0 mt-1" style={{ backgroundColor: selectedModel.providerColor + '33', color: selectedModel.providerColor }}>
                  {selectedModel.provider[0]}
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700'
              }`}>
                {msg.content || (loading && i === messages.length - 1 ? <span className="animate-pulse">●●●</span> : '')}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-4 border-t border-gray-800 bg-gray-900/50">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <textarea
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500 text-white placeholder-gray-500 min-h-[48px] max-h-[200px]"
              placeholder={`Message ${selectedModel.name}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              rows={1}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center text-xs text-gray-600 mt-2">
            Switching models starts a new conversation · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  )
}
