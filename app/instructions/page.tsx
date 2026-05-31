'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import Link from 'next/link'
import {
  Zap, MessageSquare, Users, CreditCard, Code, PenLine, Search, Calculator,
  ChevronRight, BookOpen, Lightbulb, ArrowRight, Sparkles
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

const SECTIONS = [
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'what-is-ched', label: 'What is Ched?' },
  { id: 'picking-a-model', label: 'Picking a Model' },
  { id: 'chat-tips', label: 'Chat Tips' },
  { id: 'use-cases', label: 'Use Cases' },
  { id: 'credits', label: 'Credits' },
  { id: 'rooms', label: 'Group Rooms' },
]

function SectionHeader({ id, icon: Icon, title, subtitle, color }: {
  id: string
  icon: React.ElementType
  title: string
  subtitle?: string
  color: string
}) {
  return (
    <div id={id} className="mb-6 scroll-mt-20">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '22' }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <h2 className="text-xl font-bold text-white/90">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-white/40 ml-12">{subtitle}</p>}
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1f1f1f] border border-white/8 rounded-2xl p-5 ${className}`}>
      {children}
    </div>
  )
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-white/5 last:border-0">
      <ChevronRight className="w-3.5 h-3.5 text-white/25 mt-0.5 flex-shrink-0" />
      <p className="text-sm text-white/65 leading-relaxed">{children}</p>
    </div>
  )
}

function UseCaseCard({ icon: Icon, title, color, tips }: {
  icon: React.ElementType
  title: string
  color: string
  tips: string[]
}) {
  return (
    <Card>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '22' }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <h3 className="text-sm font-semibold text-white/85">{title}</h3>
      </div>
      <div className="space-y-0">
        {tips.map((tip, i) => <Tip key={i}>{tip}</Tip>)}
      </div>
    </Card>
  )
}

export default function InstructionsPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) {
        router.replace('/login')
      } else {
        fetchData(session)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) router.replace('/login')
    })
    return () => subscription.unsubscribe()
  }, [router])

  async function fetchData(s: Session) {
    const [creditsRes, profileRes] = await Promise.all([
      fetch('/api/credits', { headers: { Authorization: `Bearer ${s.access_token}` } }),
      fetch('/api/profile', { headers: { Authorization: `Bearer ${s.access_token}` } }),
    ])
    if (creditsRes.ok) {
      const d = await creditsRes.json()
      setBalance(d.balance ?? 0)
    }
    if (profileRes.ok) setProfile(await profileRes.json())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <NavBar session={session} profile={profile} balance={balance} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-10">

          {/* Page header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-xs text-white/30 mb-4 uppercase tracking-wider font-medium">
              <BookOpen className="w-3.5 h-3.5" />
              Documentation
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white/95 mb-3">How to Use Ched</h1>
            <p className="text-base text-white/45 max-w-xl">
              Everything you need to get real value out of Ched — from picking the right model to writing better prompts.
            </p>
            {/* Section nav */}
            <div className="mt-6 flex flex-wrap gap-2">
              {SECTIONS.map(s => (
                <a key={s.id} href={`#${s.id}`}
                  className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8 transition-colors">
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* ── Quick Start ── */}
          <section id="quickstart" className="mb-12 scroll-mt-20">
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-6 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white/90">Quick Start</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">Start here</span>
              </div>
              <ol className="space-y-3">
                {[
                  { step: '1', text: 'Pick a model from the dropdown at the top of the Chat page. Not sure? Stick with DeepSeek V3 — it\'s the default and a great all-rounder.', link: null },
                  { step: '2', text: 'Type your message in the chat box and hit Enter. Be specific — the more context you give, the better the answer.', link: null },
                  { step: '3', text: 'Check your credit balance ($X.XX in the top right). Add more credits on the Credits page before you run out.', link: '/credits' },
                  { step: '4', text: 'To chat with your team, head to Rooms and @ mention @ched to get AI responses inside the conversation.', link: '/rooms' },
                ].map(({ step, text, link }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step}
                    </span>
                    <p className="text-sm text-white/65 leading-relaxed">
                      {text}{' '}
                      {link && (
                        <Link href={link} className="text-indigo-400 hover:text-indigo-300 transition-colors">
                          Go there <ArrowRight className="w-3 h-3 inline" />
                        </Link>
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── What is Ched ── */}
          <section className="mb-12">
            <SectionHeader
              id="what-is-ched"
              icon={Sparkles}
              title="What is Ched?"
              subtitle="Your company's AI platform — one interface, every major model."
              color="#8b5cf6"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Card>
                <h3 className="text-sm font-semibold text-white/80 mb-2">Multi-model platform</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Access 18+ AI models from Anthropic, OpenAI, Google, xAI, Meta, DeepSeek, Mistral, and more — all in one place. Switch models mid-conversation based on what the task needs.
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/80 mb-2">Pay as you go</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Credits are deducted per message at actual API cost plus a small service fee. No monthly subscription. Use it when you need it, stop when you don&apos;t.
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/80 mb-2">Team rooms</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Real-time group chat with AI built in. Create rooms, invite coworkers, and drop @ched into any conversation to get AI responses everyone can see.
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/80 mb-2">No lock-in</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Ched is model-agnostic. If a better model comes out tomorrow, it shows up here. You&apos;re not tied to one provider — pick what&apos;s best for each task.
                </p>
              </Card>
            </div>
          </section>

          {/* ── Picking a Model ── */}
          <section className="mb-12">
            <SectionHeader
              id="picking-a-model"
              icon={Lightbulb}
              title="Picking a Model"
              subtitle="Not all models are equal — different tools for different jobs."
              color="#f59e0b"
            />
            <Card className="mb-4">
              <p className="text-sm text-white/50 mb-4 leading-relaxed">
                The model selector sits at the center of the top nav bar. Click it to see all available models with IQ, speed, and cost ratings. Here&apos;s a quick cheat sheet:
              </p>
              <div className="space-y-3">
                {[
                  { model: 'DeepSeek V3', use: 'Default. Best value — fast, cheap, smart. 90% of tasks.', color: '#4F46E5' },
                  { model: 'Claude Sonnet', use: 'Complex writing, nuanced analysis, long documents.', color: '#D97706' },
                  { model: 'Claude Opus', use: 'Hardest tasks. Research, strategy, architecture. Slow but brilliant.', color: '#B45309' },
                  { model: 'Gemini 2.0 Flash', use: 'Need an answer NOW. Fastest model on the platform.', color: '#4285F4' },
                  { model: 'DeepSeek R1 / o3', use: 'Math, logic, step-by-step reasoning. Thinks before answering.', color: '#7C3AED' },
                  { model: 'Perplexity Sonar Pro', use: 'Real-time web search with cited sources. Current events.', color: '#20B2AA' },
                  { model: 'GPT-4o', use: 'Image analysis, structured JSON output, instruction following.', color: '#10A37F' },
                ].map(({ model, use, color }) => (
                  <div key={model} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                    <div>
                      <span className="text-sm font-semibold text-white/80">{model}</span>
                      <span className="text-sm text-white/40"> — {use}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <div className="flex items-center gap-2 text-sm text-indigo-400">
              <Link href="/models" className="flex items-center gap-1.5 hover:text-indigo-300 transition-colors">
                See the full AI Model Guide <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* ── Chat Tips ── */}
          <section className="mb-12">
            <SectionHeader
              id="chat-tips"
              icon={MessageSquare}
              title="How to Chat Effectively"
              subtitle="Better prompts → better answers. These habits compound."
              color="#10b981"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <Card>
                <h3 className="text-sm font-semibold text-white/70 mb-3">Be specific</h3>
                <div className="space-y-2">
                  <div className="bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-red-400/70 uppercase tracking-wider mb-1 font-medium">❌ Vague</p>
                    <p className="text-sm text-white/50">&ldquo;Write me an email&rdquo;</p>
                  </div>
                  <div className="bg-green-500/8 border border-green-500/15 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-green-400/70 uppercase tracking-wider mb-1 font-medium">✅ Specific</p>
                    <p className="text-sm text-white/65">&ldquo;Write a 3-sentence follow-up email to a sales prospect who went quiet after a demo last week. Friendly, not pushy.&rdquo;</p>
                  </div>
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/70 mb-3">Give context</h3>
                <div className="space-y-0">
                  <Tip>State your role: &ldquo;I&apos;m a project manager at a 50-person tech company&rdquo;</Tip>
                  <Tip>State the audience: &ldquo;explain this to a non-technical executive&rdquo;</Tip>
                  <Tip>State constraints: &ldquo;keep it under 200 words&rdquo; or &ldquo;use Python 3.10&rdquo;</Tip>
                  <Tip>Paste relevant content directly into the chat — code, data, documents</Tip>
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/70 mb-3">Use follow-ups</h3>
                <div className="space-y-0">
                  <Tip>AI gets better as the conversation continues — keep going!</Tip>
                  <Tip>&ldquo;Make it shorter&rdquo; / &ldquo;Make it more formal&rdquo; works great</Tip>
                  <Tip>&ldquo;Give me 3 different versions&rdquo; is a power move</Tip>
                  <Tip>&ldquo;Now explain why you made those choices&rdquo; builds understanding</Tip>
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/70 mb-3">Ask for structure</h3>
                <div className="space-y-0">
                  <Tip>Ask for bullet points, tables, numbered lists when you want scannable output</Tip>
                  <Tip>Request a pros/cons list for decisions</Tip>
                  <Tip>Ask it to &ldquo;think step by step&rdquo; for complex problems</Tip>
                  <Tip>For code: always ask for comments explaining the logic</Tip>
                </div>
              </Card>
            </div>
          </section>

          {/* ── Use Cases ── */}
          <section className="mb-12">
            <SectionHeader
              id="use-cases"
              icon={BookOpen}
              title="Tips by Use Case"
              subtitle="What to do (and which model to use) for common tasks."
              color="#6366f1"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <UseCaseCard
                icon={Code}
                title="Coding"
                color="#10b981"
                tips={[
                  'Paste the full error message, not a summary',
                  'Include the relevant code block — not just the line that errored',
                  'Tell it what framework/version you\'re using',
                  'Ask "what could cause this?" before asking for a fix — you\'ll understand the root cause',
                  'Best models: DeepSeek V3, Claude Sonnet, GPT-4o, o3 Mini',
                ]}
              />
              <UseCaseCard
                icon={PenLine}
                title="Writing"
                color="#f59e0b"
                tips={[
                  'Give it a tone reference — paste an example of writing you like',
                  'Specify length: "under 100 words", "3 paragraphs", "LinkedIn post format"',
                  'Tell it who\'s reading: "for a skeptical CFO" vs "for a new employee"',
                  'Use follow-ups to iterate: "make it punchier" / "less formal"',
                  'Best models: Claude Sonnet/Opus, GPT-4o, Mistral Large',
                ]}
              />
              <UseCaseCard
                icon={Search}
                title="Research"
                color="#3b82f6"
                tips={[
                  'Use Perplexity Sonar Pro for anything that needs current/live data',
                  'Ask for sources and check them — AI can hallucinate citations',
                  'Use Gemini 2.5 Pro for analyzing long documents (paste them in)',
                  '"Summarize the key points and flag what\'s uncertain" is a gold-standard research prompt',
                  'Best models: Perplexity Sonar Pro, Gemini 2.5 Pro, Claude Opus',
                ]}
              />
              <UseCaseCard
                icon={Calculator}
                title="Math & Logic"
                color="#8b5cf6"
                tips={[
                  'Use a reasoning model — DeepSeek R1, o3, or o3 Mini',
                  'Ask it to "show all steps" so you can verify the reasoning',
                  'For word problems: restate the problem in your own words first, then paste it in',
                  'Double-check critical answers — reasoning models are good but not infallible',
                  'Best models: DeepSeek R1, OpenAI o3, o3 Mini, Gemini 2.5 Pro',
                ]}
              />
            </div>
          </section>

          {/* ── Credits ── */}
          <section className="mb-12">
            <SectionHeader
              id="credits"
              icon={CreditCard}
              title="Credits Explained"
              subtitle="How billing works and how to make your credits last."
              color="#ec4899"
            />
            <Card className="mb-3">
              <h3 className="text-sm font-semibold text-white/75 mb-3">What are credits?</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-4">
                Credits are your spending balance. Every AI message costs credits based on the model used and the length of the conversation. Credits are pre-purchased and deducted per response.
              </p>
              <div className="bg-white/4 rounded-xl p-4 space-y-2.5">
                {[
                  { label: 'Gemini 2.0 Flash', cost: '~$0.0001', note: '~100,000 messages per $10' },
                  { label: 'DeepSeek V3', cost: '~$0.001', note: '~10,000 messages per $10' },
                  { label: 'GPT-4o Mini', cost: '~$0.002', note: '~5,000 messages per $10' },
                  { label: 'Claude Sonnet', cost: '~$0.01', note: '~1,000 messages per $10' },
                  { label: 'Claude Opus', cost: '~$0.05', note: '~200 messages per $10' },
                ].map(({ label, cost, note }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-white/55">{label}</span>
                    <div className="text-right">
                      <span className="text-sm font-mono text-white/75">{cost}/msg</span>
                      <span className="text-xs text-white/30 ml-2">({note})</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/25 mt-3">Estimates based on a typical message. Longer conversations cost more as previous context is re-sent each time.</p>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-white/75 mb-3">Tips to make credits last</h3>
              <div className="space-y-0">
                <Tip>Use Gemini Flash or DeepSeek V3 for simple questions — they&apos;re 10-100x cheaper than premium models</Tip>
                <Tip>Start new conversations for new topics — carrying old context adds to every message cost</Tip>
                <Tip>Be concise in your prompts — you&apos;re paying per token, not per question</Tip>
                <Tip>Reserve Claude Opus and o3 for tasks that genuinely need maximum intelligence</Tip>
              </div>
            </Card>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/credits"
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 hover:bg-indigo-500/20 transition-colors">
                <CreditCard className="w-4 h-4" />
                Add Credits
              </Link>
            </div>
          </section>

          {/* ── Rooms ── */}
          <section className="mb-12">
            <SectionHeader
              id="rooms"
              icon={Users}
              title="Group Rooms"
              subtitle="Real-time team chat with AI participation."
              color="#0ea5e9"
            />
            <Card className="mb-3">
              <h3 className="text-sm font-semibold text-white/75 mb-2">What are rooms?</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Rooms are shared chat spaces where multiple people can talk in real time — like Slack channels, but with AI built in. Messages appear instantly for everyone in the room.
              </p>
            </Card>
            <Card className="mb-3">
              <h3 className="text-sm font-semibold text-white/75 mb-3">How to use @ched</h3>
              <div className="space-y-0">
                <Tip>Type <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono text-sky-300">@ched</code> anywhere in your message to get an AI response visible to everyone in the room</Tip>
                <Tip>You can ask it anything — write a summary, explain a concept, draft something on the fly</Tip>
                <Tip>@ched sees the recent conversation context, so it understands what you&apos;re discussing</Tip>
                <Tip>Credits are deducted from whoever sends the @ched message</Tip>
              </div>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-white/75 mb-3">Best room use cases</h3>
              <div className="space-y-0">
                <Tip>Brainstorming sessions — have @ched generate ideas that the team can react to together</Tip>
                <Tip>Meeting prep — paste an agenda and ask @ched to generate questions</Tip>
                <Tip>Document drafts — collaboratively build something with AI as a contributor</Tip>
                <Tip>Explain technical concepts to non-technical teammates in plain language</Tip>
              </div>
            </Card>
            <div className="mt-4 flex items-center gap-3">
              <Link href="/rooms"
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 hover:bg-sky-500/20 transition-colors">
                <Users className="w-4 h-4" />
                Go to Rooms
              </Link>
            </div>
          </section>

          {/* Footer nav */}
          <div className="pt-6 border-t border-white/5 flex flex-wrap gap-3">
            <Link href="/models"
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8 transition-colors">
              <BookOpen className="w-4 h-4" />
              AI Model Guide
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/"
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8 transition-colors">
              <MessageSquare className="w-4 h-4" />
              Start Chatting
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
