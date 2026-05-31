'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import Link from 'next/link'
import {
  Zap, MessageSquare, Users, CreditCard, Code, PenLine, Search, Calculator,
  ChevronRight, BookOpen, Lightbulb, ArrowRight, Sparkles, Brain, Briefcase,
  FlaskConical, RefreshCw, Settings, ChevronDown, ChevronUp
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

const SECTIONS = [
  { id: 'quickstart', label: '⚡ Quick Start' },
  { id: 'what-is-ched', label: '✨ What is Ched?' },
  { id: 'picking-a-model', label: '🧠 Picking a Model' },
  { id: 'prompting', label: '✍️ Prompting Well' },
  { id: 'use-cases', label: '🗂️ Use Cases' },
  { id: 'rooms', label: '💬 Group Rooms' },
  { id: 'credits', label: '💳 Credits' },
  { id: 'pro-tips', label: '🔥 Pro Tips' },
]

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

function SectionHeader({ id, emoji, title, subtitle, color }: {
  id: string
  emoji: string
  title: string
  subtitle?: string
  color: string
}) {
  return (
    <div id={id} className="mb-6 scroll-mt-20">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
          style={{ backgroundColor: color + '20' }}>
          {emoji}
        </div>
        <h2 className="text-xl font-bold text-white/90">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-white/40 ml-12">{subtitle}</p>}
    </div>
  )
}

function ExpandableCard({ title, children, defaultOpen = false }: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-[#1f1f1f] border border-white/8 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/3 transition-colors text-left"
      >
        <span className="text-sm font-semibold text-white/75">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-white/5 pt-4">
          {children}
        </div>
      )}
    </div>
  )
}

function UseCaseCard({ emoji, title, color, tips, modelRec }: {
  emoji: string
  title: string
  color: string
  tips: string[]
  modelRec: string
}) {
  return (
    <Card>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
          style={{ backgroundColor: color + '22' }}>
          {emoji}
        </div>
        <h3 className="text-sm font-semibold text-white/85">{title}</h3>
      </div>
      <div className="space-y-0 mb-3">
        {tips.map((tip, i) => <Tip key={i}>{tip}</Tip>)}
      </div>
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-[10px] text-white/25 uppercase tracking-wider">Best models:</span>
        <span className="text-xs font-medium" style={{ color }}>{modelRec}</span>
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
              Everything you need to get real value out of Ched — from picking the right model to writing better prompts to getting the most from every conversation.
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

          {/* ── Quick Start ─────────────────────────────────────────────── */}
          <section id="quickstart" className="mb-12 scroll-mt-20">
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-6 mb-4">
              <div className="flex items-center gap-2 mb-5">
                <Zap className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-bold text-white/90">Quick Start</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-medium">Start here</span>
              </div>
              <ol className="space-y-4">
                {[
                  {
                    step: '1',
                    title: 'Sign up and get credits',
                    text: 'Create an account and add credits on the Credits page. You\'ll get a small free allowance to start. Credits are pay-as-you-go — no monthly subscription.',
                    link: '/credits',
                    linkLabel: 'Add credits',
                  },
                  {
                    step: '2',
                    title: 'Pick a model',
                    text: 'Click the model selector in the nav bar. Not sure where to start? Stick with DeepSeek V3 — it\'s the default, an excellent all-rounder, and costs a fraction of a cent per message.',
                    link: '/models',
                    linkLabel: 'See model guide',
                  },
                  {
                    step: '3',
                    title: 'Start chatting',
                    text: 'Type your question or task in the chat box. Be specific — the more context you give, the better the answer. Paste in documents, code, or data directly.',
                    link: null,
                    linkLabel: null,
                  },
                  {
                    step: '4',
                    title: 'Iterate and explore',
                    text: 'Use follow-up messages to refine answers: "make it shorter", "explain step 3", "now write the code". Conversations get better as they go.',
                    link: null,
                    linkLabel: null,
                  },
                  {
                    step: '5',
                    title: 'Try Group Rooms',
                    text: 'Invite teammates to a room and use @ched to get AI answers visible to everyone. Great for brainstorms, meeting prep, and collaborative drafts.',
                    link: '/rooms',
                    linkLabel: 'Go to Rooms',
                  },
                ].map(({ step, title, text, link, linkLabel }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white/75 mb-0.5">{title}</p>
                      <p className="text-sm text-white/50 leading-relaxed">
                        {text}{' '}
                        {link && (
                          <Link href={link} className="text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1">
                            {linkLabel} <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* ── What is Ched ─────────────────────────────────────────────── */}
          <section className="mb-12">
            <SectionHeader
              id="what-is-ched"
              emoji="✨"
              title="What is Ched?"
              subtitle="One interface, every major AI model — no subscriptions, no juggling accounts."
              color="#8b5cf6"
            />
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <Card>
                <h3 className="text-sm font-semibold text-white/80 mb-2">Multi-model platform</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Access 20+ AI models from Anthropic, OpenAI, Google, xAI, Meta, DeepSeek, Mistral, MiniMax, and Perplexity — all in one place. Switch models mid-conversation based on what the task needs.
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/80 mb-2">Pay as you go</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Credits are deducted per message at actual API cost plus a small service fee. No monthly subscription required. Use it heavily, use it lightly — you only pay for what you use.
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/80 mb-2">Team rooms</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Real-time group chat with AI built in. Create rooms, invite coworkers, and drop <code className="text-xs bg-white/10 px-1 rounded text-sky-300">@ched</code> into any conversation to get AI responses the whole team can see.
                </p>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/80 mb-2">No lock-in</h3>
                <p className="text-sm text-white/45 leading-relaxed">
                  Ched is model-agnostic. When a better model ships tomorrow, it appears here. You&apos;re never locked into one provider — pick the right tool for each task.
                </p>
              </Card>
            </div>
          </section>

          {/* ── Picking a Model ──────────────────────────────────────────── */}
          <section className="mb-12">
            <SectionHeader
              id="picking-a-model"
              emoji="🧠"
              title="Picking the Right Model"
              subtitle="Different tools for different jobs — here's the cheat sheet."
              color="#f59e0b"
            />
            <Card className="mb-4">
              <p className="text-sm text-white/50 mb-4 leading-relaxed">
                The model selector sits in the nav bar. Click it to see all models with IQ, speed, and cost ratings. Quick decision guide:
              </p>
              <div className="space-y-3">
                {[
                  { model: 'DeepSeek V3', use: 'Default. Best value — coding, writing, analysis. 90% of tasks. Nearly free.', color: '#4F46E5' },
                  { model: 'Claude Sonnet 4.5', use: 'Complex writing, nuanced analysis, documents up to 200K tokens.', color: '#D97706' },
                  { model: 'Claude Opus 4.5', use: 'Hardest tasks — architecture, deep research, expert-level reasoning.', color: '#B45309' },
                  { model: 'Gemini 2.0 Flash', use: 'Need an answer fast. Fastest model on the platform. Also cheapest.', color: '#4285F4' },
                  { model: 'Gemini 2.5 Pro', use: 'Massive documents (books, full codebases). 1M token context.', color: '#4285F4' },
                  { model: 'DeepSeek R1 / o3', use: 'Math, logic, step-by-step reasoning. Thinks before answering.', color: '#7C3AED' },
                  { model: 'Perplexity Sonar Pro', use: 'Real-time web search with verified citations. Current events.', color: '#20B2AA' },
                  { model: 'GPT-4o / GPT-5', use: 'Image analysis, structured JSON output, OpenAI tool-use workflows.', color: '#10A37F' },
                  { model: 'Grok 3 / 4', use: 'Current events + reasoning. Direct, unfiltered answers. Web search included.', color: '#1DA1F2' },
                  { model: 'Mistral Large', use: 'Multilingual content, European compliance (GDPR), 80+ languages.', color: '#FF7000' },
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
            <div className="flex items-center gap-2">
              <Link href="/models" className="inline-flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
                See the full AI Model Guide with benchmarks and real-world examples <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* ── How to Prompt ────────────────────────────────────────────── */}
          <section className="mb-12">
            <SectionHeader
              id="prompting"
              emoji="✍️"
              title="How to Write Great Prompts"
              subtitle="Better prompts → dramatically better answers. These habits compound fast."
              color="#10b981"
            />
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <Card>
                <h3 className="text-sm font-semibold text-white/70 mb-3">Be specific</h3>
                <div className="space-y-2">
                  <div className="bg-red-500/8 border border-red-500/15 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-red-400/70 uppercase tracking-wider mb-1 font-medium">❌ Vague</p>
                    <p className="text-sm text-white/50">&ldquo;Write me an email&rdquo;</p>
                  </div>
                  <div className="bg-green-500/8 border border-green-500/15 rounded-xl px-3 py-2.5">
                    <p className="text-xs text-green-400/70 uppercase tracking-wider mb-1 font-medium">✅ Specific</p>
                    <p className="text-sm text-white/65">&ldquo;Write a 3-sentence follow-up to a B2B prospect who went quiet after a demo last Tuesday. Friendly but direct. Subject line included.&rdquo;</p>
                  </div>
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/70 mb-3">Give context</h3>
                <div className="space-y-0">
                  <Tip>State your role: &ldquo;I&apos;m a PM at a 50-person SaaS startup&rdquo;</Tip>
                  <Tip>State the audience: &ldquo;explain this to a non-technical CFO&rdquo;</Tip>
                  <Tip>State constraints: &ldquo;under 200 words&rdquo; / &ldquo;Python 3.10&rdquo; / &ldquo;no jargon&rdquo;</Tip>
                  <Tip>Paste relevant content directly — code, data, documents, emails</Tip>
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/70 mb-3">Iterate, don&apos;t restart</h3>
                <div className="space-y-0">
                  <Tip>Follow-ups make AI dramatically better — keep the conversation going</Tip>
                  <Tip>&ldquo;Make it shorter&rdquo; / &ldquo;More formal&rdquo; / &ldquo;Add a CTA&rdquo; works great</Tip>
                  <Tip>&ldquo;Give me 3 different versions&rdquo; is one of the highest-value prompts</Tip>
                  <Tip>&ldquo;Now explain why you made those choices&rdquo; builds your understanding</Tip>
                </div>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-white/70 mb-3">Ask for structure</h3>
                <div className="space-y-0">
                  <Tip>Request bullets, tables, numbered lists for scannable output</Tip>
                  <Tip>&ldquo;Give me pros and cons&rdquo; works well for decisions</Tip>
                  <Tip>&ldquo;Think step by step&rdquo; dramatically improves reasoning tasks</Tip>
                  <Tip>For code: always ask for inline comments explaining the logic</Tip>
                </div>
              </Card>
            </div>

            {/* Prompt examples (expandable) */}
            <div className="space-y-3">
              <ExpandableCard title="📝 Writing prompts — examples that work">
                <div className="space-y-3">
                  {[
                    {
                      label: 'Cold outreach email',
                      prompt: 'Write a cold outreach email to a VP of Engineering at a 200-person fintech startup. Selling: a developer productivity tool that cuts code review time by 40%. Tone: direct, peer-to-peer, not salesy. Max 150 words.',
                    },
                    {
                      label: 'Executive summary',
                      prompt: 'Summarize the following 20-page market research report into a 1-page executive summary. Audience: non-technical CEO. Format: context (2 sentences), 5 key findings as bullets, 3 recommended actions. [paste report]',
                    },
                    {
                      label: 'LinkedIn post',
                      prompt: 'Write a LinkedIn post about launching our new product. Hook in the first line — no "I\'m excited to announce" opener. 150-200 words. Include a question at the end to drive comments. Professional but human tone.',
                    },
                  ].map(({ label, prompt }) => (
                    <div key={label}>
                      <p className="text-xs text-white/35 uppercase tracking-wider font-medium mb-1.5">{label}</p>
                      <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3">
                        <p className="text-sm text-white/60 leading-relaxed font-mono">{prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ExpandableCard>

              <ExpandableCard title="💻 Coding prompts — examples that work">
                <div className="space-y-3">
                  {[
                    {
                      label: 'Building from scratch',
                      prompt: 'Write a Python function that takes a list of dictionaries (each with keys: name, email, date_joined) and returns a new list with: duplicates removed by email, dates converted to ISO format, and entries sorted by date_joined ascending. Include type hints and docstring.',
                    },
                    {
                      label: 'Debugging',
                      prompt: 'This function is returning None instead of the expected list. Walk me through what\'s happening and fix it. Also explain why I hit this bug so I don\'t repeat it. [paste code + error]',
                    },
                    {
                      label: 'Code review',
                      prompt: 'Review this code for: (1) security issues, (2) performance problems, (3) readability. For each issue, explain the problem and give a concrete fix. Be direct — don\'t soften feedback. [paste code]',
                    },
                  ].map(({ label, prompt }) => (
                    <div key={label}>
                      <p className="text-xs text-white/35 uppercase tracking-wider font-medium mb-1.5">{label}</p>
                      <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3">
                        <p className="text-sm text-white/60 leading-relaxed font-mono">{prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ExpandableCard>

              <ExpandableCard title="🔍 Research prompts — examples that work">
                <div className="space-y-3">
                  {[
                    {
                      label: 'Competitive analysis',
                      prompt: 'I\'m evaluating Notion, Coda, and Linear for a 30-person engineering team. Compare them on: (1) engineering-specific features, (2) integration with GitHub, (3) pricing at 30 seats, (4) mobile experience. Give me a recommendation with clear reasoning.',
                    },
                    {
                      label: 'Document analysis',
                      prompt: 'Read the following contract and tell me: (1) what exactly am I agreeing to, (2) what are the riskiest clauses, (3) what\'s missing that should be there, (4) what would a lawyer tell me to negotiate. [paste contract]',
                    },
                    {
                      label: 'Technical research',
                      prompt: 'Explain vector databases to me. I\'m a backend developer who knows traditional SQL/NoSQL databases. Cover: what problem they solve, how they work conceptually, when to use vs not use them, and the top 3 options with honest tradeoffs.',
                    },
                  ].map(({ label, prompt }) => (
                    <div key={label}>
                      <p className="text-xs text-white/35 uppercase tracking-wider font-medium mb-1.5">{label}</p>
                      <div className="bg-green-500/5 border border-green-500/15 rounded-xl p-3">
                        <p className="text-sm text-white/60 leading-relaxed font-mono">{prompt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ExpandableCard>
            </div>
          </section>

          {/* ── Use Cases by Role ────────────────────────────────────────── */}
          <section className="mb-12">
            <SectionHeader
              id="use-cases"
              emoji="🗂️"
              title="Tips by Use Case"
              subtitle="What to do — and which model to use — for common professional tasks."
              color="#6366f1"
            />
            <div className="grid sm:grid-cols-2 gap-3">
              <UseCaseCard
                emoji="💻"
                title="Developer"
                color="#10b981"
                tips={[
                  'Paste the full error message, not just a summary of it',
                  'Include the relevant code block — context around the bug matters',
                  'State your framework, language version, and runtime environment',
                  'For architectural decisions: describe constraints first, then ask for options',
                  'Ask "what are the tradeoffs?" not just "what should I use?"',
                  'Use "now write the tests" as a follow-up to any code generation',
                ]}
                modelRec="DeepSeek V3, Claude Sonnet, GPT-4o, o3 Mini"
              />
              <UseCaseCard
                emoji="✍️"
                title="Writer / Marketer"
                color="#f59e0b"
                tips={[
                  'Give it a tone reference — paste a sample of writing you want to match',
                  'Specify format: "LinkedIn post", "3-paragraph email", "50-word tagline"',
                  'Tell it who\'s reading: "skeptical CFO" vs "excited new user"',
                  'Use "give me 5 variations, ranked by likely conversion" for copy testing',
                  'Always ask it to follow your specific style guide or brand voice',
                  'For SEO: ask it to optimize for a specific keyword phrase naturally',
                ]}
                modelRec="Claude Sonnet/Opus, GPT-5, Mistral Large (multilingual)"
              />
              <UseCaseCard
                emoji="🔍"
                title="Researcher / Analyst"
                color="#3b82f6"
                tips={[
                  'Use Perplexity Sonar Pro for anything needing current/live data',
                  'Use Gemini 2.5 Pro for analyzing very long documents (paste entire PDFs)',
                  '"Summarize key points and flag what\'s uncertain" is a gold-standard prompt',
                  'Ask for sources and verify them — AI occasionally hallucinates citations',
                  'For complex analysis: ask it to structure the answer as a framework first',
                  'Cross-reference multiple docs: paste all of them, then ask comparative questions',
                ]}
                modelRec="Perplexity Sonar Pro, Gemini 2.5 Pro, Claude Opus, Grok 4"
              />
              <UseCaseCard
                emoji="💼"
                title="Business User"
                color="#8b5cf6"
                tips={[
                  'For strategy work: give it your current situation, goals, and constraints',
                  'For decision support: ask it to steelman both sides before recommending',
                  'For presentations: "give me the narrative structure" before the content',
                  'For meetings: paste the agenda and ask for questions to ask each stakeholder',
                  'Ask it to role-play as a skeptical customer and poke holes in your pitch',
                  'Use it to draft, then edit yourself — your voice matters on external docs',
                ]}
                modelRec="Claude Sonnet/Opus, DeepSeek V3, GPT-5"
              />
              <UseCaseCard
                emoji="🧮"
                title="Math & Logic"
                color="#ec4899"
                tips={[
                  'Always use a reasoning model — DeepSeek R1, o3, or o3 Mini',
                  'Ask it to "show all steps" so you can verify the reasoning chain',
                  'For word problems: restate the problem in your words before pasting it',
                  'Double-check critical results — reasoning models are strong but not infallible',
                  'For financial models: ask it to explain each assumption it\'s making',
                  '"Find all edge cases where this logic breaks" is a powerful follow-up',
                ]}
                modelRec="DeepSeek R1, o3, o3 Mini, Gemini 2.5 Pro"
              />
              <UseCaseCard
                emoji="🌐"
                title="Current Events & Research"
                color="#20B2AA"
                tips={[
                  'Use Perplexity Sonar Pro or Grok for anything requiring today\'s data',
                  'Always ask for source links so you can verify the claims',
                  'For market research: Grok 4 combines web search + strong reasoning',
                  'Ask: "what changed in the last 6 months on this topic?"',
                  'Use follow-ups to drill deeper: "tell me more about point 3"',
                  'For competitive intelligence: ask what each competitor shipped recently',
                ]}
                modelRec="Perplexity Sonar Pro, Grok 3/4"
              />
            </div>
          </section>

          {/* ── Group Rooms ──────────────────────────────────────────────── */}
          <section className="mb-12">
            <SectionHeader
              id="rooms"
              emoji="💬"
              title="Group Rooms"
              subtitle="Real-time team chat with AI participation built in."
              color="#0ea5e9"
            />
            <Card className="mb-3">
              <h3 className="text-sm font-semibold text-white/75 mb-2">What are rooms?</h3>
              <p className="text-sm text-white/50 leading-relaxed">
                Rooms are shared chat spaces where multiple people can talk in real time — like Slack channels, but with AI built directly in. Messages appear instantly for everyone, and you can pull @ched into any part of the conversation.
              </p>
            </Card>
            <Card className="mb-3">
              <h3 className="text-sm font-semibold text-white/75 mb-3">How @ched works in rooms</h3>
              <div className="space-y-0">
                <Tip>Type <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono text-sky-300">@ched</code> anywhere in your message to trigger an AI response visible to everyone</Tip>
                <Tip>@ched reads the recent room context, so it understands what the team is discussing</Tip>
                <Tip>You can ask anything — draft something, explain a concept, summarize the thread</Tip>
                <Tip>Credits are deducted from whoever sends the @ched message, not the room</Tip>
                <Tip>You can specify a model: <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded font-mono text-sky-300">@ched [sonnet]</code> to use a specific model</Tip>
              </div>
            </Card>
            <Card className="mb-3">
              <h3 className="text-sm font-semibold text-white/75 mb-3">Best room use cases</h3>
              <div className="space-y-0">
                <Tip>Brainstorming — have @ched generate 10 ideas, then the team votes and refines</Tip>
                <Tip>Meeting prep — paste an agenda and ask @ched to generate smart questions for each item</Tip>
                <Tip>Live document drafts — collaboratively write something with @ched as a contributor</Tip>
                <Tip>Explain technical concepts to non-technical teammates in plain language, live</Tip>
                <Tip>Decision support — ask @ched to steelman each side of a debate the team is having</Tip>
              </div>
            </Card>
            <div className="mt-4">
              <Link href="/rooms"
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-sky-500/15 border border-sky-500/25 text-sky-400 hover:bg-sky-500/20 transition-colors">
                <Users className="w-4 h-4" />
                Go to Rooms
              </Link>
            </div>
          </section>

          {/* ── Credits ──────────────────────────────────────────────────── */}
          <section className="mb-12">
            <SectionHeader
              id="credits"
              emoji="💳"
              title="Credits Explained"
              subtitle="How billing works and how to make every dollar count."
              color="#ec4899"
            />
            <Card className="mb-3">
              <h3 className="text-sm font-semibold text-white/75 mb-3">What are credits?</h3>
              <p className="text-sm text-white/50 leading-relaxed mb-4">
                Credits are your balance. Every AI response costs credits based on the model used and the length of the conversation. Longer conversations cost more because your prior messages are included as context each time.
              </p>
              <div className="bg-white/4 rounded-xl p-4 space-y-2.5">
                {[
                  { label: 'Gemini 2.0 Flash', cost: '~$0.0001', note: '~40,000 msgs / $10', color: '#4285F4' },
                  { label: 'DeepSeek V3', cost: '~$0.001', note: '~14,000 msgs / $10', color: '#4F46E5' },
                  { label: 'GPT-4o Mini', cost: '~$0.002', note: '~5,000 msgs / $10', color: '#10A37F' },
                  { label: 'Grok 3 Mini', cost: '~$0.002', note: '~5,000 msgs / $10', color: '#1DA1F2' },
                  { label: 'DeepSeek R1', cost: '~$0.003', note: '~3,000 msgs / $10', color: '#7C3AED' },
                  { label: 'Claude Sonnet 4.5', cost: '~$0.009', note: '~1,100 msgs / $10', color: '#D97706' },
                  { label: 'Gemini 2.5 Pro', cost: '~$0.006', note: '~1,700 msgs / $10', color: '#4285F4' },
                  { label: 'Claude Opus 4.5', cost: '~$0.045', note: '~220 msgs / $10', color: '#B45309' },
                ].map(({ label, cost, note, color }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-sm text-white/55">{label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono text-white/75">{cost}/msg</span>
                      <span className="text-xs text-white/30 ml-2">({note})</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/25 mt-3">Estimates based on a typical ~500 token exchange. Longer conversations cost more as prior context is re-sent each time.</p>
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-white/75 mb-3">Make your credits last</h3>
              <div className="space-y-0">
                <Tip>Use Gemini Flash or DeepSeek V3 for simple questions — 10-100x cheaper than premium models with comparable quality</Tip>
                <Tip>Start new conversations for new topics — carrying old context adds to every message cost</Tip>
                <Tip>Be concise in your prompts — you pay per token sent and received</Tip>
                <Tip>Reserve Claude Opus and o3 for tasks that genuinely need maximum intelligence</Tip>
                <Tip>Use Perplexity only when you actually need current/live data — it&apos;s expensive for static information</Tip>
              </div>
            </Card>
            <div className="mt-4">
              <Link href="/credits"
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-xl bg-pink-500/15 border border-pink-500/25 text-pink-400 hover:bg-pink-500/20 transition-colors">
                <CreditCard className="w-4 h-4" />
                Add Credits
              </Link>
            </div>
          </section>

          {/* ── Pro Tips ─────────────────────────────────────────────────── */}
          <section className="mb-12">
            <SectionHeader
              id="pro-tips"
              emoji="🔥"
              title="Pro Tips"
              subtitle="Habits that separate power users from everyone else."
              color="#f97316"
            />
            <div className="space-y-3">

              <Card>
                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white/80 mb-2">Use system prompts to set permanent context</h3>
                    <p className="text-sm text-white/50 leading-relaxed mb-2">
                      Before your actual question, add a &ldquo;system&rdquo; block that tells the AI who you are and what you need. It applies to the whole conversation.
                    </p>
                    <div className="bg-white/4 rounded-xl p-3 font-mono text-xs text-white/50">
                      You are a senior Python developer reviewing code for a fintech startup. Always highlight security concerns first, then performance, then style. Be direct.
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white/80 mb-2">Know when to start fresh</h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Long conversations accumulate context that can confuse the model. If the AI starts giving off responses or seems confused, start a new conversation. Also: switching topics entirely = start fresh (cheaper + cleaner).
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <Brain className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white/80 mb-2">Model-specific power tips</h3>
                    <div className="space-y-2 mt-2">
                      {[
                        { model: 'DeepSeek R1 / o3', tip: 'Add "think step by step and show your work" for any math or logic problem' },
                        { model: 'Claude Sonnet', tip: 'Paste a writing sample and say "match this tone exactly" for brand-consistent output' },
                        { model: 'Perplexity Sonar', tip: 'Ask "give me 5 recent sources on X" to rapidly gather a reading list on any topic' },
                        { model: 'Gemini 2.5 Pro', tip: 'Paste an entire codebase or PDF — it can hold 1M tokens in a single conversation' },
                        { model: 'Grok 3/4', tip: 'Ask "what happened with X company/topic this week?" — it has live web access' },
                        { model: 'GPT-4o', tip: 'Paste a screenshot of a UI, spreadsheet, or chart and ask "what does this show?"' },
                      ].map(({ model, tip }) => (
                        <div key={model} className="flex items-start gap-2">
                          <span className="text-[10px] text-white/30 font-mono bg-white/5 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap">{model}</span>
                          <p className="text-sm text-white/55">{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white/80 mb-2">The &ldquo;rubber duck upgrade&rdquo;</h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      When you&apos;re stuck on a problem, describe it fully to Ched even if you think you know the answer. The act of articulating it clearly often reveals the issue — and if it doesn&apos;t, you have an AI ready to help. It&apos;s rubber duck debugging with a duck that talks back.
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <FlaskConical className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white/80 mb-2">Model comparison for the same task</h3>
                    <p className="text-sm text-white/50 leading-relaxed">
                      Not sure which model is best for your specific task? Send the same prompt to DeepSeek V3 and Claude Sonnet in separate conversations. Compare the results. You&apos;ll quickly develop intuition for which model fits your work style and tasks — and the comparison cost is negligible.
                    </p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-white/80 mb-2">The best follow-up prompts</h3>
                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      {[
                        '"Make it shorter"',
                        '"Make it longer"',
                        '"Be more direct"',
                        '"Explain why"',
                        '"Give me 3 variations"',
                        '"What are the risks?"',
                        '"Show me an example"',
                        '"What am I missing?"',
                        '"Steelman the opposite"',
                        '"Explain to a 5-year-old"',
                      ].map(p => (
                        <div key={p} className="text-xs font-mono bg-white/4 border border-white/6 rounded-lg px-2 py-1.5 text-white/45">
                          {p}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

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
            <Link href="/rooms"
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8 transition-colors">
              <Users className="w-4 h-4" />
              Group Rooms
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
