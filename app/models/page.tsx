'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { MODELS, AIModel } from '@/lib/models'
import Link from 'next/link'
import {
  CheckCircle, XCircle, BookOpen, ChevronDown, ChevronUp, ArrowRight, Zap,
  Trophy, Brain, Gauge, Globe, Lock, TrendingUp
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

// ─── Benchmark & guide data keyed by model id ────────────────────────────────
interface ModelGuide {
  fullDescription: string
  bestFor: string[]
  limitations: string[]
  pricingContext: string
  vsOthers: string
  benchmarks: {
    mmlu?: string
    humaneval?: string
    arenaElo?: string
    math?: string
    gpqa?: string
    note?: string
  }
  knowledgeCutoff: string
  canGenerateImages: boolean
  hasWebSearch: boolean
  openSource: boolean
}

const MODEL_GUIDE: Record<string, ModelGuide> = {
  'anthropic/claude-sonnet-4-5': {
    fullDescription: 'Claude Sonnet 4.5 is Anthropic\'s flagship balanced model — the most practical combination of intelligence and speed in the Claude 4 family. Built on Anthropic\'s Constitutional AI approach, it produces responses that feel genuinely thoughtful rather than mechanically generated. Its 200K context window lets you feed in entire codebases, lengthy contracts, or research papers and get coherent analysis across all of it. It consistently ranks among the top models on writing quality benchmarks and is the reference model most professionals default to for general-purpose work.',
    bestFor: [
      'Writing a comprehensive business strategy document from rough bullet points',
      'Reviewing and refactoring a 500-line codebase with clear explanations of each change',
      'Drafting a nuanced performance review for a difficult employee situation',
      'Synthesizing findings from 5 research papers into a 2-page executive summary',
      'Writing marketing copy that needs to hit a specific brand voice precisely',
      'Analyzing a contract and flagging ambiguous, risky, or missing clauses',
      'Building a structured argument on a controversial topic with counterarguments addressed',
      'Generating comprehensive documentation for an undocumented codebase',
    ],
    limitations: [
      '❌ No real-time web access — knowledge has a training cutoff (early 2025)',
      '❌ Cannot generate, edit, or process images/audio/video',
      '💸 More expensive than DeepSeek V3 for simple everyday tasks',
      '🐢 Slower than Haiku or Gemini Flash for quick one-line lookups',
    ],
    pricingContext: 'At $3.00 input / $15.00 output per 1M tokens, a typical 500-token exchange costs roughly $0.009. With $10 you get ~1,100 quality conversations. Compare: ChatGPT Plus at $20/mo gives unlimited GPT-4o but throttles you after ~80 messages/3h. For heavy users, pay-as-you-go on Ched can be cheaper.',
    vsOthers: 'Sonnet is the writing and analysis benchmark. DeepSeek V3 is 10x cheaper and 90% as good — use that for most tasks. Reach for Sonnet when nuance, long documents (>64K tokens), or complex reasoning chains matter. Opus 4.5 is for the absolute hardest tasks where Sonnet visibly struggles.',
    benchmarks: {
      mmlu: '88.0%',
      humaneval: '85.2%',
      arenaElo: '~1320',
      math: '78.2%',
      note: 'Top-5 on LMSYS Chatbot Arena as of early 2025. Outperforms GPT-4o on writing quality in blind human evals.',
    },
    knowledgeCutoff: 'Early 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'anthropic/claude-opus-4-5': {
    fullDescription: 'Claude Opus 4.5 is Anthropic\'s most powerful model — held for the tasks that genuinely require it. It uses extended thinking to reason through complex multi-step problems with extraordinary depth. Where Sonnet is brilliant at general tasks, Opus excels at work requiring expert-level judgment: intricate architecture decisions, deep competitive intelligence, genuinely persuasive long-form writing, or any task where you\'ve tried Sonnet and the result wasn\'t good enough. The quality ceiling is meaningfully higher; the speed and cost are significantly worse.',
    bestFor: [
      'Designing architecture for a complex distributed system from ambiguous requirements',
      'Deep competitive analysis requiring synthesis of a dozen data sources into insight',
      'Writing a fundraising pitch deck narrative that needs to be genuinely persuasive',
      'Analyzing a complex legal dispute and reasoning through strategic options',
      'Auditing an entire codebase for security vulnerabilities with detailed explanations',
      'Producing a complete technical specification from vague product requirements',
      'Expert-level research synthesis: "What does the literature actually say about X?"',
      'Multi-turn strategic consulting conversations requiring consistent reasoning across many messages',
    ],
    limitations: [
      '💸 5x more expensive than Claude Sonnet — reserve for genuinely hard tasks',
      '🐢 Noticeably slower (30-90 seconds for complex reasoning)',
      '❌ No real-time web access',
      '❌ Cannot generate or process images/audio/video',
      '⚠️ Overkill for most tasks — wastes credits without adding value',
    ],
    pricingContext: 'At $15.00 input / $75.00 output per 1M tokens, a typical message costs ~$0.045. With $10 you get ~220 deep conversations. Reserve this for work where you\'d otherwise hire a consultant — architecture reviews, strategy documents, complex analysis. The ROI has to justify the cost.',
    vsOthers: 'Only reach for Opus when Sonnet genuinely isn\'t enough. Run your task with Sonnet first. If the output is clearly lacking — missing crucial nuance, mishandling complex reasoning, or producing writing that feels shallow — that\'s when Opus earns its premium. For pure coding, DeepSeek R1 often outperforms Opus at 10% of the cost.',
    benchmarks: {
      mmlu: '90.4%',
      humaneval: '84.9%',
      arenaElo: '~1380',
      gpqa: '59.5%',
      note: 'Top-3 overall on LMSYS Chatbot Arena. Anthropic\'s internal evaluations show Opus significantly outperforms Sonnet on nuanced writing and expert-level reasoning tasks.',
    },
    knowledgeCutoff: 'Early 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'anthropic/claude-haiku-4-5': {
    fullDescription: 'Claude Haiku 4.5 is Anthropic\'s speed-optimized model — designed to handle the vast majority of everyday tasks at a fraction of the cost of Sonnet. Despite being the "budget" Claude, it punches well above its weight class and has the same 200K token context window as its siblings. The tradeoff is it won\'t gracefully handle the most complex multi-step reasoning or produce the most nuanced long-form writing. For high-volume, repetitive, or time-sensitive work, it\'s the right call.',
    bestFor: [
      'Quickly summarizing a meeting transcript or long email thread',
      'Drafting a first-pass email that you\'ll review and edit yourself',
      'Answering quick factual questions from documents you paste in',
      'Simple code tasks: writing a regex, a utility function, or a quick script',
      'Generating 10 subject line variations for an email A/B test',
      'Classifying or tagging large batches of short text entries',
      'Quick tone/grammar review of a short piece of writing',
    ],
    limitations: [
      '⚠️ Less capable on complex multi-step reasoning chains',
      '⚠️ May miss subtle nuances in ambiguous writing or analysis tasks',
      '❌ No real-time web access',
      '❌ Cannot generate or process images/audio/video',
    ],
    pricingContext: 'At $0.80 input / $4.00 output per 1M tokens, a typical message costs ~$0.0024. With $10 you get ~4,000 conversations — ideal for high-volume daily use. It\'s 4x cheaper than Sonnet; if your task is simple, there\'s no reason to pay more.',
    vsOthers: 'Use Haiku when the task is clear-cut and speed matters. If the output feels off or misses nuance, escalate to Sonnet. For pure speed at even lower cost, Gemini 2.0 Flash rivals Haiku. For reasoning tasks, DeepSeek R1 is worth the extra cost.',
    benchmarks: {
      mmlu: '82.1%',
      humaneval: '80.4%',
      arenaElo: '~1250',
      note: 'Strong performance for its price tier. Significantly outperforms GPT-3.5 class models on reasoning benchmarks.',
    },
    knowledgeCutoff: 'Early 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'openai/gpt-5': {
    fullDescription: 'GPT-5 is OpenAI\'s most powerful model as of mid-2025 — a significant leap over GPT-4o on reasoning, coding, and instruction following. It uses a unified architecture handling text, images, and structured data natively. On coding benchmarks, GPT-5 approaches the performance of specialized reasoning models. On LMSYS Chatbot Arena, it debuted near the top of the leaderboard. It\'s noticeably better than GPT-4o at maintaining coherent reasoning over long, multi-step tasks and at understanding ambiguous instructions.',
    bestFor: [
      'Complex multi-step coding projects requiring coherent design across many functions',
      'Analyzing and describing complex visual diagrams, charts, or screenshots',
      'Generating precisely structured JSON/XML output from ambiguous input data',
      'Following intricate multi-step prompt templates with many constraints',
      'Advanced instruction following where GPT-4o made mistakes',
      'Multimodal tasks: code review of a screenshot, extracting data from an image of a table',
      'Long-horizon agentic tasks where the model needs to maintain state across many steps',
    ],
    limitations: [
      '❌ Cannot generate images (only analyze them)',
      '⚠️ Knowledge cutoff limits current-events awareness',
      '💸 More expensive than GPT-4o; less cost-efficient than DeepSeek V3',
      '🐢 Slower than GPT-4o Mini for simple tasks',
    ],
    pricingContext: 'At $1.25 input / $10.00 output per 1M tokens, a typical message costs ~$0.0056. Cheaper than Claude Sonnet while offering competitive performance. With $10 you get ~1,800 quality conversations.',
    vsOthers: 'GPT-5 vs Claude Sonnet: GPT-5 leads on multimodal tasks and strict instruction following; Claude Sonnet leads on nuanced long-form writing. GPT-5 vs DeepSeek V3: GPT-5 is better for complex reasoning and multimodal; DeepSeek V3 is far cheaper for text-only work. Choose GPT-5 when you need OpenAI\'s ecosystem (function calling, fine-tuning, structured outputs) plus top-tier intelligence.',
    benchmarks: {
      mmlu: '91.2%',
      humaneval: '89.5%',
      arenaElo: '~1380',
      math: '82.4%',
      gpqa: '62.1%',
      note: 'Debuted near top of LMSYS Arena leaderboard. Strong across all benchmark categories — a genuinely significant improvement over GPT-4o.',
    },
    knowledgeCutoff: 'Early 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'openai/gpt-4o': {
    fullDescription: 'GPT-4o is OpenAI\'s flagship multimodal model — the "o" stands for "omni," meaning it processes text, images, audio, and video natively. Battle-tested by hundreds of millions of users, it\'s particularly excellent at following complex instructions precisely, generating structured outputs (JSON, XML, function calls), and understanding images you paste into the chat. It has a different "feel" from Claude — more literal and instruction-following rather than interpretive. The most integrated model in the OpenAI ecosystem for developers building with function calling and structured outputs.',
    bestFor: [
      'Analyzing a screenshot of a UI and listing specific UX improvements',
      'Generating precise JSON from unstructured text with a specific schema',
      'Following a detailed multi-step prompt template with many hard constraints',
      'Extracting specific fields from a document or invoice image',
      'Code generation that must conform to a strict schema or API format',
      'Processing a chart image and describing the underlying data pattern',
      'Agentic applications using OpenAI function calling / tool use',
    ],
    limitations: [
      '❌ Cannot generate images — only analyze them',
      '⚠️ Knowledge cutoff — no real-time web access by default',
      '⚠️ Slightly less nuanced on pure writing quality vs Claude Sonnet',
      '📐 128K context window (smaller than Claude at 200K or Gemini at 1M)',
    ],
    pricingContext: 'At $2.50 input / $10.00 output per 1M tokens, a typical message costs ~$0.006. With $10 you get ~1,600 conversations. ChatGPT Plus at $20/mo bundles GPT-4o access — if you use it >3,300 messages/month, Plus is cheaper.',
    vsOthers: 'Pick GPT-4o when working with images, needing strict JSON/schema output, or for developer tool-use workflows. Claude Sonnet produces better prose writing. DeepSeek V3 is 10x cheaper for text-only. GPT-5 is now better than GPT-4o on most tasks — consider upgrading for complex work.',
    benchmarks: {
      mmlu: '88.7%',
      humaneval: '90.2%',
      arenaElo: '~1285',
      math: '76.6%',
      note: 'Strong HumanEval score reflects OpenAI\'s coding optimization. Arena ELO has declined as newer models launched.',
    },
    knowledgeCutoff: 'October 2023',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'openai/gpt-4o-mini': {
    fullDescription: 'GPT-4o Mini delivers approximately 94% of GPT-4o\'s capability at roughly 15x lower cost. It\'s OpenAI\'s sweet spot for everyday tasks — fast enough to feel instant, smart enough for most professional use cases, and cheap enough to use freely for bulk tasks. It retains the same instruction-following strengths as GPT-4o, supports image input, and is the most cost-efficient entry point into the OpenAI ecosystem. For most business users whose tasks don\'t require max intelligence, Mini is the right default OpenAI model.',
    bestFor: [
      'Writing a cold outreach email for a B2B sales prospect',
      'Answering customer support questions from a knowledge base you paste in',
      'Summarizing a long article into 3 key bullets',
      'Generating 10 social media post variations from a brief',
      'Simple data processing: reformatting, cleaning, transforming structured data',
      'Drafting a first version of any document that you\'ll edit yourself',
      'High-volume classification or tagging tasks across many items',
    ],
    limitations: [
      '⚠️ Less capable on complex multi-step reasoning than GPT-4o',
      '⚠️ May oversimplify nuanced analysis',
      '❌ No real-time web access',
      '📐 128K context window',
    ],
    pricingContext: 'At $0.15 input / $0.60 output per 1M tokens, a typical message costs ~$0.00038. With $10 you get ~26,000 messages — essentially unlimited for normal use. The cost is so low that there\'s almost no reason not to try it first before escalating to more expensive models.',
    vsOthers: 'GPT-4o Mini vs DeepSeek V3: similar pricing, comparable quality — DeepSeek slightly stronger on coding, Mini slightly stronger on instruction following. vs Claude Haiku: both are budget options; Haiku has a larger context window, Mini has better image support. For most tasks, try Mini or DeepSeek V3 first.',
    benchmarks: {
      mmlu: '82.0%',
      humaneval: '87.2%',
      arenaElo: '~1180',
      note: 'Strong HumanEval shows solid coding despite being a "mini" model. Good baseline for cost-sensitive applications.',
    },
    knowledgeCutoff: 'October 2023',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'openai/o3-mini': {
    fullDescription: 'o3 Mini is OpenAI\'s compact reasoning model — part of the o-series that thinks step-by-step before answering. Unlike standard LLMs that generate responses immediately, o-series models run internal chain-of-thought reasoning which dramatically improves accuracy on math, logic, and coding. The "mini" version makes this capability affordable. When you see an o-series model pause for several seconds before answering, it\'s actively working through the problem — that delay is value.',
    bestFor: [
      'Solving a multi-step calculus, probability, or statistics problem',
      'Debugging complex logic errors in code where the bug isn\'t immediately obvious',
      'Working through a financial projection model step by step',
      'Analyzing a competitive scenario with multiple interacting variables',
      'Solving algorithm/data structure problems (LeetCode-style)',
      'Verifying whether a proof, argument, or contract clause is logically consistent',
      'Physics or chemistry word problems requiring multi-step setup',
    ],
    limitations: [
      '🐢 Slower than standard models — reasoning adds 10-60 seconds',
      '⚠️ Overkill for simple questions — wastes time and credits',
      '❌ No real-time web access',
      '❌ Cannot process images',
    ],
    pricingContext: 'At $1.10 input / $4.40 output per 1M tokens, a typical message costs ~$0.0027. With $10 you get ~3,700 reasoning conversations — solid value for the accuracy you gain. Much cheaper than o3 full for tasks that don\'t need maximum reasoning depth.',
    vsOthers: 'o3 Mini vs DeepSeek R1: both are strong reasoning models at similar prices. R1 is slightly stronger on math olympiad-level problems; o3 Mini is stronger on coding. o3 Mini vs o3 full: use Mini for 95% of reasoning tasks, save o3 full for the absolute hardest cases. o3 Mini vs Claude Sonnet: o3 for math/logic, Sonnet for writing and analysis.',
    benchmarks: {
      mmlu: '90.8%',
      humaneval: '92.0%',
      arenaElo: '~1310',
      math: '90.0%',
      gpqa: '60.0%',
      note: 'Exceptional HumanEval and MATH scores confirm genuine reasoning capability. Competes with much larger models.',
    },
    knowledgeCutoff: 'Early 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'openai/o3': {
    fullDescription: 'o3 is OpenAI\'s most powerful reasoning model — the pinnacle of the o-series and one of the most capable models in existence for hard analytical problems. It scored at PhD-level on the GPQA science benchmark and near-perfect on AIME math competitions. It was the first model to pass the ARC-AGI challenge, a benchmark designed to be resistant to AI systems. It spends significantly more time "thinking" before responding — minutes for the hardest problems — producing analysis that reflects a level of care unavailable in standard LLMs.',
    bestFor: [
      'Solving competition-level mathematics (AMC/AIME/Olympiad problems)',
      'Designing a complex distributed system architecture from first principles',
      'Analyzing an ML model\'s failure modes and proposing systematic fixes',
      'Working through multi-step physics or chemistry derivations',
      'Reviewing critical infrastructure code for subtle security bugs',
      'Evaluating the logical validity of a complex legal or business argument',
      'Research-grade scientific reasoning tasks',
    ],
    limitations: [
      '🐢 Very slow — can take 60-300 seconds for complex problems',
      '💸 More expensive than o3 Mini for most tasks that don\'t need max depth',
      '❌ No real-time web access',
      '❌ Cannot process images',
      '⚠️ Absolute overkill for anything not requiring deep reasoning',
    ],
    pricingContext: 'At $2.00 input / $8.00 output per 1M tokens, it\'s priced similarly to GPT-4o but much more capable for reasoning tasks. With $10 you get ~1,200 conversations. The cost is justified when you\'re solving a problem that would otherwise require a domain expert.',
    vsOthers: 'o3 is purpose-built for the hardest reasoning tasks. Claude Sonnet/Opus is better for writing and analysis. DeepSeek R1 is 5-8x cheaper for most reasoning tasks and competitive on math benchmarks. o3 is the right call when you need OpenAI\'s best and the problem genuinely demands it.',
    benchmarks: {
      mmlu: '91.8%',
      humaneval: '96.7%',
      arenaElo: '~1400',
      math: '96.7%',
      gpqa: '87.7%',
      note: 'First model to score >85% on GPQA Diamond. Near-perfect MATH benchmark. ARC-AGI solve rate that shocked the research community.',
    },
    knowledgeCutoff: 'Early 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'x-ai/grok-4.20': {
    fullDescription: 'Grok 4 is xAI\'s most powerful model, specifically designed for multi-step reasoning, deep research workflows, and agentic tasks. Built on a massive compute cluster, it offers real-time web access baked into the model, meaning it can ground its answers in live web data without requiring an external search tool. It takes a direct, unhedged approach to controversial topics — willing to engage where other models add excessive caveats. Grok 4 represents a step-change over Grok 3 in reasoning depth and context length.',
    bestFor: [
      'Deep research requiring both internet lookups and sophisticated synthesis',
      'Current events analysis where you need live data and sharp reasoning together',
      'Agentic multi-step tasks (research → analyze → draft → revise)',
      'Complex reasoning chains on real-world situations with current context',
      'Getting a blunt, unfiltered perspective on a controversial decision',
      'Analysis of recent developments in fast-moving fields (AI, crypto, politics)',
    ],
    limitations: [
      '⚠️ Real-time web access can occasionally surface unreliable sources',
      '📐 Context window smaller than Gemini\'s 1M tokens',
      '❌ Cannot generate images',
      '⚠️ Direct communication style may not suit all professional contexts',
    ],
    pricingContext: 'At $1.25 input / $2.50 output per 1M tokens, Grok 4 is competitively priced given its capabilities — especially considering real-time web is included. With $10 you get ~2,500 research conversations. Significantly cheaper output rate than Claude Sonnet or Perplexity Sonar Pro.',
    vsOthers: 'Grok 4 vs Perplexity Sonar Pro: Grok 4 has stronger reasoning depth; Sonar Pro has better citation formatting. Grok 4 vs Claude Opus: Grok 4 wins on current events and direct answers; Opus wins on nuanced writing and reasoning without web dependence. Choose Grok 4 when you need real-time data + strong reasoning in one call.',
    benchmarks: {
      arenaElo: '~1370',
      note: 'Strong performance on reasoning benchmarks. Real-time web grounding means benchmark comparisons to static models are somewhat apples-to-oranges. Generally competitive with Claude Opus tier.',
    },
    knowledgeCutoff: 'Real-time (live web access)',
    canGenerateImages: false,
    hasWebSearch: true,
    openSource: false,
  },
  'x-ai/grok-3': {
    fullDescription: 'Grok 3 is xAI\'s established flagship, built on a 100K+ GPU training cluster and designed to compete directly with GPT-4o and Claude Sonnet. It has native real-time web access and is known for direct, uncensored responses. It genuinely rivals frontier models on benchmarks and has a noticeably different personality — more willing to engage with edgy, controversial, or politically sensitive topics than its competitors. For current events research combined with serious reasoning, it remains a strong choice.',
    bestFor: [
      'Researching what happened in the news this week with smart synthesis',
      'Analyzing a company or stock with recent developments factored in',
      'Getting a direct opinion on a controversial business or political decision',
      'Large-scale reasoning on topics where current context matters',
      'Coding tasks where you want direct answers without excessive hedging',
      'Understanding how a recent tech release or announcement affects a landscape',
    ],
    limitations: [
      '⚠️ Real-time web access introduces occasional inconsistency',
      '📐 131K context window vs 200K for Claude and 1M for Gemini',
      '❌ Cannot generate images',
      '⚠️ Direct style can come across as blunt in professional communications',
    ],
    pricingContext: 'At $3.00 input / $15.00 output per 1M tokens, pricing matches Claude Sonnet. The real-time web access is a meaningful value-add at this price — you\'re getting live search + strong reasoning for the same cost as a static model.',
    vsOthers: 'Grok 3 vs Claude Sonnet: Grok wins on current events and directness; Sonnet wins on nuanced writing and creative tasks. Grok 3 vs Grok 4: Grok 4 is more capable overall; Grok 3 is the same price. Grok 3 vs Perplexity: Grok has stronger reasoning; Perplexity has better citation formatting.',
    benchmarks: {
      mmlu: '88.5%',
      humaneval: '84.0%',
      arenaElo: '~1290',
      math: '78.9%',
      note: 'Competitive with GPT-4o and Claude Sonnet tier. Real-time web capability is a meaningful differentiator.',
    },
    knowledgeCutoff: 'Real-time (live web access)',
    canGenerateImages: false,
    hasWebSearch: true,
    openSource: false,
  },
  'x-ai/grok-3-mini': {
    fullDescription: 'Grok 3 Mini is the lighter, faster, cheaper version of Grok 3. It retains the real-time web access and direct communication style that makes Grok distinctive, but at a fraction of the cost. Great for quick lookups, current event summaries, and social media content where you want Grok\'s personality and live data without the flagship price tag. At $0.30 input / $0.50 output, it\'s one of the cheapest models with real-time web search anywhere.',
    bestFor: [
      'Quick lookups for recent news or current facts',
      'Generating social media content with a punchy, direct voice',
      'Fast answers to time-sensitive questions about current events',
      'Summarizing what happened recently on a topic',
      'Budget-friendly research tasks where recency matters',
      'Casual, conversational Q&A where personality and directness matter',
    ],
    limitations: [
      '⚠️ Less capable than Grok 3 on complex multi-step reasoning',
      '⚠️ May miss nuance on complicated analysis tasks',
      '📐 131K context window',
      '❌ Cannot generate images',
    ],
    pricingContext: 'At $0.30 input / $0.50 output per 1M tokens, this is one of the cheapest models with real-time web access. With $10 you get ~10,000+ quick searches. Cheapest entry point to live web-grounded AI.',
    vsOthers: 'Grok 3 Mini is the cheapest way to get live web data in your answers. Perplexity Sonar Pro has better citation formatting but costs 10x more. Grok 3 Mini wins for casual current-events lookups on a budget.',
    benchmarks: {
      arenaElo: '~1180',
      note: 'Solid performance for its price tier. Reasoning capability is notably stronger than models of comparable cost.',
    },
    knowledgeCutoff: 'Real-time (live web access)',
    canGenerateImages: false,
    hasWebSearch: true,
    openSource: false,
  },
  'deepseek/deepseek-chat-v3-0324': {
    fullDescription: 'DeepSeek V3 is the model that shocked the AI industry in early 2025 — trained for a fraction of the cost of GPT-4o while matching it on most benchmarks. Built by a Chinese AI lab, it uses a Mixture of Experts (MoE) architecture that activates only the most relevant portions of the model per query, making it extraordinarily efficient. It consistently scores within a few points of Claude Sonnet and GPT-4o on coding and reasoning benchmarks, at roughly 1/10th the cost. It\'s the default on Ched for a reason: 90% of tasks need no more than this, and it\'s nearly free.',
    bestFor: [
      'Writing a complete Python script from a natural language description',
      'Cleaning and transforming a messy CSV or dataset with specific business rules',
      'Drafting a business email, proposal, or formal report',
      'Answering detailed analytical questions from documents you paste in',
      'Building out a feature specification from a rough idea',
      'General-purpose Q&A and research across any topic',
      'Code review and refactoring with explanations',
    ],
    limitations: [
      '📐 64K context window — can\'t process very long documents (use Gemini 2.5 Pro for those)',
      '❌ No real-time web access',
      '❌ Cannot generate or analyze images',
      '⚠️ Chinese lab — some enterprise users have data sovereignty concerns',
    ],
    pricingContext: 'At $0.27 input / $1.10 output per 1M tokens, a typical message costs ~$0.00068. With $10 you get ~14,700 conversations. This is why it\'s the default. Most professional tasks — emails, analysis, coding, Q&A — run perfectly well here at essentially zero cost.',
    vsOthers: 'DeepSeek V3 is the best-value model on the platform. For 90% of tasks it matches Claude Sonnet quality at 10x lower cost. Reach for Sonnet when you need longer documents (>64K tokens) or particularly nuanced writing. Use R1/o3 when step-by-step reasoning is the point.',
    benchmarks: {
      mmlu: '88.5%',
      humaneval: '89.3%',
      arenaElo: '~1280',
      math: '84.0%',
      note: 'Benchmarks match or slightly exceed GPT-4o at 1/10th the cost. Industry-disrupting price-to-performance ratio.',
    },
    knowledgeCutoff: 'January 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'deepseek/deepseek-r1': {
    fullDescription: 'DeepSeek R1 is DeepSeek\'s reasoning model — the direct answer to OpenAI\'s o1, built using reinforcement learning to develop genuine chain-of-thought reasoning capabilities. It was one of the most significant benchmarking events of early 2025: matching o1\'s reasoning performance at 20-30x lower cost. It shows its thinking process transparently, so you can follow along as it reasons through a problem. For math, science, and logic tasks, it competes with the best models in the world.',
    bestFor: [
      'Solving calculus, statistics, or linear algebra problems step by step',
      'Working through a logic puzzle or brain teaser with full verification',
      'Analyzing a complex algorithm for correctness and edge cases',
      'Breaking down a physics or chemistry problem methodically',
      'Finding the logical flaw in a business argument or proposal',
      'Proof-checking mathematical derivations or claims',
      'Step-by-step debugging of code with unknown root cause',
    ],
    limitations: [
      '🐢 Slower than non-reasoning models — chain-of-thought adds latency',
      '📐 64K context window',
      '❌ No real-time web access',
      '❌ Cannot process images',
      '⚠️ Overkill for tasks that don\'t need step-by-step reasoning',
    ],
    pricingContext: 'At $0.55 input / $2.19 output per 1M tokens, it\'s roughly 20x cheaper than OpenAI o1/o3 for equivalent reasoning quality. With $10 you get ~4,500 reasoning conversations. The cost difference is so large that R1 should be the default reasoning model for most users.',
    vsOthers: 'DeepSeek R1 vs o3 Mini: R1 leads on math olympiad-level problems; o3 Mini leads on coding benchmarks. R1 is significantly cheaper than o3 Mini. R1 vs DeepSeek V3: V3 is faster and cheaper for tasks that don\'t need step-by-step reasoning; R1 is for when you need the work shown.',
    benchmarks: {
      mmlu: '90.8%',
      humaneval: '92.5%',
      arenaElo: '~1310',
      math: '97.3%',
      gpqa: '71.5%',
      note: 'Exceptional MATH score (97.3%) at a fraction of o1 cost. GPQA performance confirms genuine scientific reasoning ability.',
    },
    knowledgeCutoff: 'January 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: true,
  },
  'deepseek/deepseek-r1-0528': {
    fullDescription: 'DeepSeek R1 (May 28 update) is the refined version of the original R1, released May 2025. It improves instruction following, reduces occasional reasoning errors, and produces more reliable step-by-step outputs. It outperforms the original R1 on most benchmarks while maintaining the same exceptional price. If you were going to use R1, use this version — it\'s strictly better. The architecture and training approach remain the same; this is a polished, improved iteration.',
    bestFor: [
      'Same tasks as R1 original — improved accuracy and instruction following',
      'Mathematical proofs and multi-step derivations',
      'Complex debugging requiring systematic logical trace-through',
      'Scientific reasoning across STEM disciplines',
      'Algorithm design, analysis, and optimization',
      'Verifying the correctness of reasoning chains or arguments',
    ],
    limitations: [
      '🐢 Same latency characteristics as R1 — slow for complex problems',
      '📐 64K context window',
      '❌ No real-time web access',
      '❌ Cannot process images',
    ],
    pricingContext: 'At $0.50 input / $2.15 output per 1M tokens — slightly cheaper than the original R1. With $10 you get ~4,600 reasoning conversations. Strictly better than R1 at slightly lower cost — no reason to use the original.',
    vsOthers: 'Use this instead of the original DeepSeek R1 for all reasoning tasks. Same pricing advantage over o3/o3-mini applies. Vs Claude Sonnet: R1-0528 for math and logic problems; Sonnet for writing, analysis, and anything requiring nuance or creativity.',
    benchmarks: {
      mmlu: '91.5%',
      humaneval: '93.1%',
      math: '97.3%',
      gpqa: '72.0%',
      arenaElo: '~1330',
      note: 'Marginally improved across all benchmarks vs original R1. Represents current state-of-the-art for open reasoning models.',
    },
    knowledgeCutoff: 'January 2025',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: true,
  },
  'google/gemini-2.5-pro-preview': {
    fullDescription: 'Gemini 2.5 Pro is Google\'s smartest model and the one with the largest context window in existence — 1 million tokens. That means you can paste in an entire book, a massive codebase, a year of meeting transcripts, or dozens of long documents and have a coherent conversation about all of it simultaneously. It\'s genuinely multimodal (text, images, audio, video natively), built on Google\'s latest TPU training infrastructure, and rivals Anthropic and OpenAI on most benchmarks. The 1M context is its defining competitive advantage.',
    bestFor: [
      'Analyzing an entire codebase at once (paste 200+ files worth of code)',
      'Summarizing and cross-referencing a 300-page research report or book',
      'Building insights from a full year of meeting transcripts',
      'Comparing and contrasting 20 long documents simultaneously',
      'Analyzing audio or video content for insights (with native media support)',
      'Long iterative projects where you need the full conversation history accessible',
      'Academic literature review across many papers at once',
    ],
    limitations: [
      '🐢 Slower and more expensive for long contexts vs Gemini Flash',
      '⚠️ Preview model — may occasionally produce inconsistent results',
      '❌ No real-time web search in this deployment',
      '❌ Cannot generate images or audio',
    ],
    pricingContext: 'At $1.25 input / $10.00 output per 1M tokens, normal messages cost ~$0.005. For a massive document analysis (sending 500K tokens), it could cost $0.63 — still far cheaper than alternatives. The 1M context means one API call can handle what might take 50+ calls with a smaller context model.',
    vsOthers: 'Gemini 2.5 Pro vs Claude Sonnet: Sonnet is typically better quality for writing and reasoning; Gemini wins when document length exceeds 200K tokens. Gemini 2.5 Pro vs Gemini Flash: Pro has higher quality; Flash is much faster and cheaper for short tasks. Choose Pro when the context length is the constraint — nothing else handles 1M tokens.',
    benchmarks: {
      mmlu: '90.0%',
      humaneval: '87.0%',
      arenaElo: '~1360',
      math: '91.6%',
      gpqa: '84.0%',
      note: 'Strong GPQA score (84%) competes with top reasoning models. The 1M context window benchmarks are uniquely in a class of its own.',
    },
    knowledgeCutoff: 'Late 2024',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'google/gemini-2.0-flash-001': {
    fullDescription: 'Gemini 2.0 Flash is the fastest model on the platform — Google built it specifically to minimize latency. It processes text, images, audio, and video at speeds that feel nearly instant. The quality is lower than Gemini Pro, but for tasks that need a rapid response and aren\'t deeply complex, it\'s unmatched. Remarkably, it still has a 1M token context window despite being the budget/speed option. For high-volume processing where cost and speed are the constraints, nothing beats it.',
    bestFor: [
      'Quick factual lookups where you just need a fast answer',
      'Rapid iteration — generating 20 variations of something quickly',
      'High-volume batch processing (hundreds of items)',
      'Quick image analysis: "What\'s in this photo? What does this chart show?"',
      'Low-latency chatbot experiences where < 1s response is required',
      'Simple classification or extraction tasks at scale',
    ],
    limitations: [
      '⚠️ Lower quality than Gemini 2.5 Pro on complex reasoning',
      '⚠️ May struggle with subtle nuances and multi-step analysis',
      '❌ No real-time web search by default',
      '⚠️ Not ideal for long-form writing where quality matters',
    ],
    pricingContext: 'At $0.10 input / $0.40 output per 1M tokens, a typical message costs ~$0.00025. With $10 you get ~40,000 conversations — the cheapest capable multimodal model available. Virtually free for normal usage.',
    vsOthers: 'Gemini Flash vs Claude Haiku: Flash is faster and cheaper; Haiku is slightly higher quality for nuanced text. Flash vs DeepSeek V3: Flash wins on speed and multimodal; V3 wins on text reasoning quality. If you just need something fast and cheap, Flash is the default choice.',
    benchmarks: {
      mmlu: '78.9%',
      humaneval: '74.2%',
      arenaElo: '~1210',
      note: 'Lower benchmark scores than Pro, but excellent for the price and speed. Optimized for throughput, not max quality.',
    },
    knowledgeCutoff: 'Late 2024',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'meta-llama/llama-4-maverick': {
    fullDescription: 'Llama 4 Maverick is Meta\'s latest open-source flagship, and it\'s a genuine contender against closed-source models. The "open source" label means the model weights are publicly available, which matters for privacy-conscious users and enterprises who may want to self-host. Despite being open source, it delivers performance competitive with GPT-4o at a fraction of the cost, with a massive 1M token context window. Meta\'s Llama series has redefined what\'s possible with open AI development.',
    bestFor: [
      'Projects where open-source, reproducibility, and auditability matter',
      'Coding and analysis tasks at near-zero cost',
      'Privacy-sensitive workloads (can be self-hosted by enterprises)',
      'Long document processing at minimal cost (1M token context)',
      'Organizations with data residency or sovereignty requirements',
      'Developers who want a base model for fine-tuning on custom data',
    ],
    limitations: [
      '❌ No real-time web access',
      '⚠️ Slightly less polished than Claude on pure writing quality',
      '⚠️ Open source ≠ free — API usage on Ched still costs credits',
      '⚠️ Image support limited in this deployment',
    ],
    pricingContext: 'At $0.15 input / $0.60 output per 1M tokens, matches GPT-4o Mini pricing but with 1M context. With $10 you get ~13,000 conversations. Best-in-class context-to-cost ratio for an open model.',
    vsOthers: 'Llama 4 Maverick vs DeepSeek V3: both are budget options; DeepSeek V3 slightly stronger reasoning, Llama is open source. Maverick vs GPT-4o Mini: similar price, comparable quality; Maverick has larger context. Choose Maverick for open-source credentials, privacy focus, or when 1M context matters.',
    benchmarks: {
      mmlu: '85.5%',
      humaneval: '85.0%',
      arenaElo: '~1260',
      math: '73.5%',
      note: 'Impressive for open source — competitive with closed-source models in its price tier. Best open-source MMLU score at launch.',
    },
    knowledgeCutoff: 'December 2024',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: true,
  },
  'meta-llama/llama-3.3-70b-instruct': {
    fullDescription: 'Llama 3.3 70B is Meta\'s proven workhorse — the 70-billion parameter model that established Meta as a serious AI lab. It\'s been battle-tested by the open source community for over a year and has strong performance across coding, writing, and analysis at a very low price. While the newer Llama 4 Maverick is more capable, the 3.3 70B has a longer track record, a massive ecosystem of community tooling, and excellent reliability.',
    bestFor: [
      'Reliable everyday tasks where you want a proven, stable model',
      'Coding and scripting tasks at minimal cost',
      'Bulk document processing where cost is the primary constraint',
      'Applications built on the open-source ecosystem',
      'Teams comfortable with slightly lower capability for significantly lower cost',
      'Privacy-focused applications that can be self-hosted',
    ],
    limitations: [
      '⚠️ Superseded by Llama 4 Maverick on most capability metrics',
      '📐 128K context window (vs 1M for Llama 4)',
      '❌ No real-time web access',
      '❌ Cannot process images',
    ],
    pricingContext: 'At $0.10 input / $0.32 output per 1M tokens — one of the cheapest capable models. With $10 you get ~21,000 conversations. Primarily valuable when you need the lowest possible per-message cost and the task is simple enough.',
    vsOthers: 'For new projects, consider Llama 4 Maverick instead — more capable, 1M context, similar price. Llama 3.3 70B is the choice for existing integrations or when you want maximum cost savings on simple tasks.',
    benchmarks: {
      mmlu: '86.0%',
      humaneval: '88.4%',
      arenaElo: '~1220',
      note: 'Solid established benchmark performance. One of the most widely deployed open-source models in the industry.',
    },
    knowledgeCutoff: 'December 2023',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: true,
  },
  'minimax/minimax-m2.5': {
    fullDescription: 'MiniMax M2.5 is MiniMax\'s latest release and arguably the cheapest capable AI for long-document tasks on the market. Built by a Chinese startup, it combines a massive 1M token context window with pricing that undercuts nearly everything else. It\'s not the sharpest tool for complex reasoning, but for long document processing, bulk tasks, and budget-conscious daily use, it delivers solid results at pennies per query. The 1M context at this price point is genuinely unique.',
    bestFor: [
      'Processing very long documents at minimal cost (research papers, annual reports)',
      'Bulk content generation where cost matters more than perfection',
      'Summarizing large text collections cheaply',
      'High-volume use cases where per-query cost is the bottleneck',
      'Simple Q&A on long documents where speed > precision',
      'Experimenting with AI capabilities on a very tight budget',
    ],
    limitations: [
      '⚠️ Less capable on complex reasoning than top-tier models',
      '⚠️ Chinese lab — data privacy considerations for enterprise users',
      '⚠️ Less community track record than Claude/GPT/Gemini',
      '⚠️ May struggle with sophisticated writing requiring deep context understanding',
    ],
    pricingContext: 'At $0.15 input / $1.15 output per 1M tokens, it\'s remarkably cheap for a 1M context model. With $10 you can process enormous volumes of text. Best for use cases where document length forces 1M context but budget prevents using Gemini Pro.',
    vsOthers: 'MiniMax M2.5 vs Gemini 2.0 Flash: Flash is faster and more reliable; M2.5 is cheaper for long-document tasks. M2.5 vs Llama 4 Maverick: similar price, Maverick is more proven. Use M2.5 when you need 1M context at minimal cost.',
    benchmarks: {
      mmlu: '80.5%',
      humaneval: '79.0%',
      note: 'Moderate benchmark performance. Strength is cost-efficiency for long-context tasks, not raw intelligence.',
    },
    knowledgeCutoff: 'Late 2024',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'minimax/minimax-m1': {
    fullDescription: 'MiniMax M1 is MiniMax\'s flagship model with extended thinking capability — it can reason step by step on hard problems while still offering the 1M token context window the company is known for. It fills a unique niche: a reasoning model that can also handle very long documents. It\'s competitively priced against other reasoning models and is particularly strong at math and coding tasks. For the combination of reasoning + massive context at reasonable cost, it has few competitors.',
    bestFor: [
      'Math and coding problems where step-by-step reasoning is needed on long documents',
      'Complex analysis of large logs or datasets requiring systematic reasoning',
      'Budget-friendly alternative to Claude Opus for long document analysis',
      'Coding projects where you want to include the full codebase in context',
      'Research synthesis requiring both reasoning depth and large source intake',
      'Multi-step analysis tasks that also need significant context length',
    ],
    limitations: [
      '⚠️ Less polished writing quality than Claude or GPT flagship models',
      '⚠️ Chinese lab — data privacy considerations',
      '🐢 Slower when using extended thinking mode',
      '⚠️ Less community track record than top providers',
    ],
    pricingContext: 'At $0.40 input / $2.20 output per 1M tokens, competitively priced for a reasoning model with huge context. Compare: OpenAI o3 at $2.00/$8.00 for 200K context vs M1 at $0.40/$2.20 for 1M context — significantly better economics if you need both capabilities.',
    vsOthers: 'MiniMax M1 is unique in combining reasoning + 1M context at a budget price. Claude Sonnet has better writing quality and reliability. Use M1 when you need the reasoning+context combination and can accept somewhat lower reliability.',
    benchmarks: {
      mmlu: '85.0%',
      humaneval: '85.3%',
      math: '82.0%',
      note: 'Strong math performance for the price tier. The reasoning + 1M context combination is the unique selling proposition.',
    },
    knowledgeCutoff: 'Late 2024',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
  'perplexity/sonar-pro': {
    fullDescription: 'Perplexity Sonar Pro is the only model on the platform purpose-built for real-time web search. Every answer is grounded in live web results with citations you can verify and trace back to sources. It doesn\'t just add web access to a language model — it\'s architecturally redesigned around the search-and-answer paradigm. If you need current information, recent news, live statistics, or factual claims about the world as it exists today, Sonar Pro is the only model that can deliver reliably.',
    bestFor: [
      'Researching what a company announced in their earnings call this week',
      'Fact-checking a specific claim with verifiable current sources',
      'Finding the latest statistics or research in a fast-moving field',
      'Getting a summary of today\'s news in a specific industry vertical',
      'Competitive research: "What are my competitors shipping right now?"',
      'Answering "current state of X" questions in tech, markets, or current events',
      'Any question where the answer might have changed in the last 6 months',
    ],
    limitations: [
      '💸 More expensive than general-purpose models at same pricing tier',
      '⚠️ Less capable than Claude/GPT on pure writing and reasoning without web content',
      '⚠️ Search grounding means answers vary between identical queries',
      '❌ Cannot generate images or process media',
    ],
    pricingContext: 'At $3.00 input / $15.00 output per 1M tokens, it matches Claude Sonnet pricing. The real-time search capability is the full value proposition here — for current events and live research, it\'s worth every credit. For tasks that don\'t require live data, use a cheaper model.',
    vsOthers: 'Sonar Pro vs Grok 3/4: Grok has stronger reasoning; Sonar Pro has better citation formatting and research-first UX. Sonar Pro vs Claude Sonnet: Sonnet wins on everything except current information; Sonar wins whenever recency matters. If your question could be answered from pre-2024 training data, use Sonnet instead.',
    benchmarks: {
      arenaElo: '~1255',
      note: 'Arena benchmarks less applicable — Sonar is optimized for search quality, not reasoning benchmarks. Best evaluated on factual recency accuracy, where it excels.',
    },
    knowledgeCutoff: 'Real-time (live web search)',
    canGenerateImages: false,
    hasWebSearch: true,
    openSource: false,
  },
  'mistralai/mistral-large-2512': {
    fullDescription: 'Mistral Large is France\'s best AI — built by a Paris-based lab with a focus on European compliance, privacy, and multilingual capability. It natively supports 80+ languages and is one of the few models where GDPR compliance and the possibility of data residency in Europe are foundational architecture decisions, not add-ons. For European enterprises, regulated industries, multilingual content teams, or anyone with strong privacy requirements, it\'s the model to reach for. Its performance on English reasoning is competitive if not at the frontier.',
    bestFor: [
      'Drafting documents in French, German, Spanish, Italian, Portuguese, or other languages',
      'Business writing for audiences where GDPR compliance documentation is required',
      'Processing multilingual customer feedback, support tickets, or reviews',
      'Legal or compliance documents for European regulatory contexts',
      'Translating and localizing content across European markets with cultural nuance',
      'Organizations with strict data sovereignty requirements who want European infrastructure',
    ],
    limitations: [
      '⚠️ Less capable than Claude/GPT on English-only tasks',
      '❌ No real-time web access',
      '❌ Cannot process images',
      '📐 128K context window (smaller than Gemini or Meta models)',
    ],
    pricingContext: 'At $0.50 input / $1.50 output per 1M tokens, it\'s affordable for a capable multilingual model. With $10 you get ~5,000 conversations. For non-English use cases, there\'s nothing better at this price point.',
    vsOthers: 'Mistral Large is the default for multilingual and European compliance use cases — no other model matches it here. For English-only tasks, Claude Sonnet or GPT-4o will outperform it. Mistral is primarily a specialized tool, not a general-purpose replacement.',
    benchmarks: {
      mmlu: '84.0%',
      humaneval: '84.5%',
      arenaElo: '~1245',
      note: 'Strong multilingual benchmarks — particularly French, German, and Spanish. Competitive English performance for its size class.',
    },
    knowledgeCutoff: 'Late 2024',
    canGenerateImages: false,
    hasWebSearch: false,
    openSource: false,
  },
}

// ─── Compare table ───────────────────────────────────────────────────────────
const COMPARE_TABLE = [
  { rank: 1, category: 'Best All-Purpose', model: 'DeepSeek V3', why: 'GPT-4o quality at 1/10th cost', iq: '8.8', color: '#4F46E5' },
  { rank: 2, category: 'Best Writing', model: 'Claude Sonnet 4.5', why: 'Nuance, long-form, tone control', iq: '9.5', color: '#D97706' },
  { rank: 3, category: 'Best Reasoning', model: 'DeepSeek R1 / o3', why: 'Math, logic, step-by-step', iq: '9.4', color: '#7C3AED' },
  { rank: 4, category: 'Highest IQ', model: 'Claude Opus 4.5 / o3', why: 'Maximum intelligence, no compromises', iq: '10.0', color: '#B45309' },
  { rank: 5, category: 'Fastest', model: 'Gemini 2.0 Flash', why: '< 1s responses, 1M context', iq: '7.5', color: '#4285F4' },
  { rank: 6, category: 'Best Web Search', model: 'Perplexity Sonar Pro', why: 'Live data + verified citations', iq: '8.5', color: '#20B2AA' },
  { rank: 7, category: 'Longest Context', model: 'Gemini 2.5 Pro', why: '1M tokens — entire books', iq: '9.4', color: '#4285F4' },
  { rank: 8, category: 'Best Open Source', model: 'Llama 4 Maverick', why: 'Open weights, 1M context, cheap', iq: '8.5', color: '#0866FF' },
  { rank: 9, category: 'Best Budget', model: 'Gemini 2.0 Flash', why: '~$0.0001/msg, still multimodal', iq: '7.5', color: '#4285F4' },
  { rank: 10, category: 'Best Multilingual', model: 'Mistral Large', why: 'GDPR + 80 languages', iq: '8.3', color: '#FF7000' },
]

// ─── Sub components ──────────────────────────────────────────────────────────
function BenchmarkChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-lg px-2 py-1">
      <span className="text-[9px] text-white/30 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-xs font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  )
}

function CapabilityBadge({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border ${
      active
        ? 'text-white/70'
        : 'text-white/20 border-white/5 bg-transparent'
    }`}
      style={active ? { borderColor: color + '40', backgroundColor: color + '15', color: color } : {}}>
      {active ? '✓' : '✗'} {label}
    </span>
  )
}

function ModelCard({ model }: { model: AIModel }) {
  const [expanded, setExpanded] = useState(false)
  const guide = MODEL_GUIDE[model.id]
  const msgsPerDollar = Math.round(1 / ((model.costPer1MInput * 0.0005 + model.costPer1MOutput * 0.0005)))

  return (
    <div className="bg-[#1a1a1a] border border-white/8 rounded-2xl overflow-hidden hover:border-white/12 transition-colors">
      {/* Header */}
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: model.providerColor + '22', color: model.providerColor }}>
              {model.provider[0]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white/90">{model.name}</h3>
                {model.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{ backgroundColor: (model.badgeColor || model.providerColor) + '22', color: model.badgeColor || model.providerColor }}>
                    {model.badge}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/40 mt-0.5">{model.tagline}</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white/4 rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1">IQ</p>
            <p className="text-sm font-bold" style={{ color: model.providerColor }}>{model.intelligenceRating}/10</p>
          </div>
          <div className="bg-white/4 rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1">Speed</p>
            <p className="text-sm font-bold text-green-400">{model.speedRating}/10</p>
          </div>
          <div className="bg-white/4 rounded-xl p-2.5 text-center">
            <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-1">Context</p>
            <p className="text-xs font-bold text-white/60">{model.contextWindow}</p>
          </div>
        </div>

        {/* Capability badges */}
        {guide && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            <CapabilityBadge label="Web Search" active={guide.hasWebSearch} color={model.providerColor} />
            <CapabilityBadge label="Images" active={guide.canGenerateImages} color={model.providerColor} />
            <CapabilityBadge label="Open Source" active={guide.openSource} color={model.providerColor} />
          </div>
        )}

        {/* Pricing */}
        <div className="flex items-center justify-between bg-white/4 rounded-xl px-3 py-2.5 mb-3">
          <div>
            <p className="text-xs font-mono text-white/60">${model.costPer1MInput} in · ${model.costPer1MOutput} out</p>
            <p className="text-[10px] text-white/30 mt-0.5">per 1M tokens</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white/70">~{msgsPerDollar.toLocaleString()}</p>
            <p className="text-[10px] text-white/30">msgs / $1</p>
          </div>
        </div>

        {/* Benchmarks */}
        {guide?.benchmarks && (
          <div className="flex flex-wrap gap-1.5">
            {guide.benchmarks.mmlu && <BenchmarkChip label="General Knowledge" value={guide.benchmarks.mmlu} color={model.providerColor} />}
            {guide.benchmarks.humaneval && <BenchmarkChip label="Coding Score" value={guide.benchmarks.humaneval} color={model.providerColor} />}
            {guide.benchmarks.math && <BenchmarkChip label="Math Score" value={guide.benchmarks.math} color={model.providerColor} />}
            {guide.benchmarks.arenaElo && <BenchmarkChip label="Community Rank" value={guide.benchmarks.arenaElo} color={model.providerColor} />}
            {guide.benchmarks.gpqa && <BenchmarkChip label="Science IQ" value={guide.benchmarks.gpqa} color={model.providerColor} />}
          </div>
        )}
      </div>

      {/* Expandable section */}
      {guide && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-5 py-3 bg-white/2 border-t border-white/5 hover:bg-white/4 transition-colors"
          >
            <span className="text-xs text-white/40 font-medium">Full guide — real use cases, limitations, pricing context</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/25" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25" />}
          </button>

          {expanded && (
            <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-5">
              {/* Full description */}
              <p className="text-sm text-white/55 leading-relaxed">{guide.fullDescription}</p>

              {/* Best for */}
              <div>
                <h4 className="text-xs font-semibold text-green-400/80 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Real-World Best Uses
                </h4>
                <div className="space-y-1.5">
                  {guide.bestFor.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500/60 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-white/60 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Limitations */}
              <div>
                <h4 className="text-xs font-semibold text-red-400/80 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Hard Limitations
                </h4>
                <div className="space-y-1.5">
                  {guide.limitations.map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-white/60 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benchmarks note */}
              {guide.benchmarks.note && (
                <div className="bg-white/3 border border-white/6 rounded-xl p-3.5">
                  <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    How We Score Models
                  </h4>
                  <p className="text-sm text-white/45 leading-relaxed">{guide.benchmarks.note}</p>
                  <p className="text-xs text-white/25 mt-1.5">Knowledge cutoff: {guide.knowledgeCutoff}</p>
                </div>
              )}

              {/* Pricing context */}
              <div className="bg-amber-500/6 border border-amber-500/15 rounded-xl p-3.5">
                <h4 className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-1.5">💰 Pricing in Context</h4>
                <p className="text-sm text-white/55 leading-relaxed">{guide.pricingContext}</p>
              </div>

              {/* vs others */}
              <div className="bg-indigo-500/6 border border-indigo-500/15 rounded-xl p-3.5">
                <h4 className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wider mb-1.5">⚡ When to Pick This vs Alternatives</h4>
                <p className="text-sm text-white/55 leading-relaxed">{guide.vsOthers}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Group models by provider
const PROVIDER_ORDER = ['Anthropic', 'OpenAI', 'Google', 'xAI', 'DeepSeek', 'Meta', 'MiniMax', 'Perplexity', 'Mistral AI']

function groupByProvider(models: AIModel[]): Record<string, AIModel[]> {
  const groups: Record<string, AIModel[]> = {}
  for (const m of models) {
    if (!groups[m.provider]) groups[m.provider] = []
    groups[m.provider].push(m)
  }
  return groups
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function ModelsPage() {
  const router = useRouter()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [filterProvider, setFilterProvider] = useState<string | null>(null)

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

  const grouped = groupByProvider(MODELS)
  const providers = PROVIDER_ORDER.filter(p => grouped[p])
  const filteredProviders = filterProvider ? [filterProvider] : providers

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white overflow-hidden">
      <NavBar session={session} profile={profile} balance={balance} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-10">

          {/* Page header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 text-xs text-white/30 mb-4 uppercase tracking-wider font-medium">
              <BookOpen className="w-3.5 h-3.5" />
              AI Reference Guide
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white/95 mb-3">AI Model Guide</h1>
            <p className="text-base text-white/45 max-w-2xl">
              Deep dive on every model available in Ched — what it&apos;s actually built for, real benchmarks, honest limitations, and when to use it over everything else. {MODELS.length} models across {providers.length} providers.
            </p>
          </div>

          {/* Compare table — sticky context */}
          <div className="bg-[#111] border border-white/8 rounded-2xl mb-10 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-semibold text-white/70">Quick Reference — Pick the Right Model</h2>
            </div>
            <div className="divide-y divide-white/5">
              {COMPARE_TABLE.map(({ rank, category, model, why, iq, color }) => (
                <div key={category} className="flex items-center px-5 py-3 hover:bg-white/2 transition-colors gap-3">
                  <span className="text-[10px] font-mono text-white/20 w-4 flex-shrink-0">{rank}</span>
                  <span className="text-xs text-white/30 w-36 flex-shrink-0">{category}</span>
                  <span className="text-sm font-semibold flex-1" style={{ color }}>{model}</span>
                  <span className="text-xs text-white/30 hidden sm:block">{why}</span>
                  <span className="text-xs font-mono font-bold text-white/50 w-8 text-right">IQ {iq}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mb-8 text-xs text-white/35">
            <div className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5" /> General Knowledge — how well the model knows facts, history, science, and general topics (out of 100%)</div>
            <div className="flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Coding Score — how well it writes working code, tested against real programming problems (out of 100%)</div>
            <div className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Arena ELO — human preference voting</div>
            <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Math Score — performance on competition-level math problems (out of 100%)</div>
            <div className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Science IQ — PhD-level science questions — only the smartest models score high here</div>
            <div className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Community Rank — ELO score from thousands of real humans voting which AI gave the better answer in head-to-head battles. Higher = better.</div>
          </div>

          {/* Provider filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setFilterProvider(null)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filterProvider === null
                  ? 'bg-white/10 border-white/20 text-white/80'
                  : 'bg-white/4 border-white/8 text-white/40 hover:text-white/60'
              }`}
            >
              All ({MODELS.length})
            </button>
            {providers.map(p => {
              const color = grouped[p][0].providerColor
              return (
                <button
                  key={p}
                  onClick={() => setFilterProvider(filterProvider === p ? null : p)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    filterProvider === p ? 'text-white/80' : 'text-white/40 hover:text-white/60'
                  }`}
                  style={filterProvider === p
                    ? { backgroundColor: color + '22', borderColor: color + '40', color }
                    : { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  {p} ({grouped[p].length})
                </button>
              )
            })}
          </div>

          {/* Provider sections */}
          <div className="space-y-10">
            {filteredProviders.map(provider => {
              const providerModels = grouped[provider]
              const color = providerModels[0].providerColor
              const guide0 = MODEL_GUIDE[providerModels[0].id]
              return (
                <section key={provider}>
                  {/* Provider header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: color + '22', color }}>
                      {provider[0]}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-white/85">{provider}</h2>
                      <p className="text-xs text-white/30">{providerModels.length} model{providerModels.length > 1 ? 's' : ''} available</p>
                    </div>
                    {/* Provider capability tags */}
                    {guide0 && (
                      <div className="hidden sm:flex items-center gap-1.5">
                        {guide0.hasWebSearch && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: color + '20', color }}>
                            🌐 Web Search
                          </span>
                        )}
                        {guide0.openSource && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ backgroundColor: color + '20', color }}>
                            🔓 Open Source
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Model cards grid */}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {providerModels.map(model => (
                      <ModelCard key={model.id} model={model} />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-white/5 flex flex-wrap gap-3">
            <Link href="/instructions"
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8 transition-colors">
              <BookOpen className="w-4 h-4" />
              How to Use Ched
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link href="/"
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/8 transition-colors">
              Start Chatting
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
