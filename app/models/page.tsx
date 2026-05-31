'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { NavBar } from '@/components/NavBar'
import { MODELS, AIModel } from '@/lib/models'
import Link from 'next/link'
import {
  CheckCircle, XCircle, BookOpen, ChevronDown, ChevronUp, ArrowRight, Zap
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'

interface Profile {
  display_name?: string | null
  avatar_url?: string | null
  avatar_color?: string | null
}

// Extended guide data keyed by model id
const MODEL_GUIDE: Record<string, {
  fullDescription: string
  bestFor: string[]
  limitations: string[]
  pricingContext: string
  vsClaudeSonnet: string
}> = {
  'anthropic/claude-sonnet-4-5': {
    fullDescription: 'Claude Sonnet 4.5 is Anthropic\'s flagship balanced model — the culmination of years of research into safe, helpful AI. It excels at nuanced, long-form reasoning, producing writing that feels genuinely human rather than AI-generated. With a 200K token context window, it can process entire codebases, legal documents, or research papers in a single conversation. It\'s the benchmark all other models are compared against for general-purpose use.',
    bestFor: [
      'Writing a comprehensive business strategy document from rough notes',
      'Reviewing and refactoring a 500-line codebase with explanations',
      'Drafting a nuanced performance review for a difficult employee situation',
      'Synthesizing research from multiple papers into an executive summary',
      'Writing marketing copy that needs to hit a specific tone or brand voice',
      'Analyzing a contract and flagging ambiguous or risky clauses',
    ],
    limitations: [
      'No real-time web access — knowledge has a training cutoff',
      'Cannot generate images or process audio/video',
      'More expensive than budget models for simple tasks',
      'Slower than Haiku or Gemini Flash for quick lookups',
    ],
    pricingContext: 'At $3.00 input / $15.00 output per 1M tokens, a typical message (~500 tokens each way) costs roughly $0.009. With $10 you could have about 1,100 quality conversations.',
    vsClaudeSonnet: 'This IS Claude Sonnet — the reference model.',
  },
  'anthropic/claude-opus-4-5': {
    fullDescription: 'Claude Opus 4.5 is Anthropic\'s most powerful model — their absolute best, held for the tasks that need it. Where Sonnet is brilliant, Opus is extraordinary. It excels at multi-step reasoning that requires holding enormous amounts of context together, at expert-level analysis that goes beyond surface-level insights, and at writing that requires genuine strategic thinking. It\'s slower and significantly more expensive, but when quality is everything, Opus delivers.',
    bestFor: [
      'Designing the architecture for a complex multi-service software system',
      'Deep competitive analysis requiring synthesis of multiple data sources',
      'Writing a fundraising pitch that needs to be genuinely persuasive',
      'Analyzing a complex legal dispute and recommending strategy',
      'Reviewing an entire codebase for security vulnerabilities with explanations',
      'Producing a detailed technical specification from vague requirements',
    ],
    limitations: [
      'Significantly more expensive — 5x the cost of Sonnet',
      'Noticeably slower response times',
      'No real-time web access',
      'Cannot generate images or process audio/video',
      'Overkill for simple tasks — wastes credits',
    ],
    pricingContext: 'At $15.00 input / $75.00 output per 1M tokens, a typical message costs roughly $0.045. With $10 you\'d get about 220 conversations. Reserve this for your hardest tasks.',
    vsClaudeSonnet: 'Only reach for Opus when Sonnet genuinely isn\'t enough — complex architecture decisions, deep research synthesis, or tasks where you\'ve already tried Sonnet and want better.',
  },
  'anthropic/claude-haiku-4-5': {
    fullDescription: 'Claude Haiku 4.5 is Anthropic\'s speed-optimized model — designed to handle the vast majority of everyday tasks at a fraction of the cost of Sonnet. Despite being the "budget" Anthropic option, it punches well above its weight. It has the same 200K context window and retains Claude\'s characteristic quality of writing. The tradeoff is that it won\'t handle the most complex reasoning chains as gracefully as Sonnet.',
    bestFor: [
      'Quickly summarizing a meeting transcript or email thread',
      'Drafting a first-pass email that you\'ll edit yourself',
      'Answering a quick factual question from a document you paste in',
      'Simple code tasks like writing a regex or a small utility function',
      'Generating 10 subject line variations for an A/B test',
      'High-volume tasks where you need AI at scale without breaking the budget',
    ],
    limitations: [
      'Less capable on complex multi-step reasoning',
      'May miss subtle nuances in ambiguous writing tasks',
      'No real-time web access',
      'Cannot generate images or process audio/video',
    ],
    pricingContext: 'At $0.80 input / $4.00 output per 1M tokens, a typical message costs roughly $0.0024. With $10 you could have about 4,000 conversations — perfect for high-volume use.',
    vsClaudeSonnet: 'Use Haiku when speed matters and the task is straightforward. If your response is "off" or missing something, try Sonnet. Haiku costs ~4x less.',
  },
  'openai/gpt-4o': {
    fullDescription: 'GPT-4o is OpenAI\'s flagship multimodal model — the "o" stands for "omni," meaning it handles text, images, audio, and video natively. It\'s battle-tested by hundreds of millions of users worldwide and is particularly excellent at following complex instructions precisely, generating structured outputs (like JSON), and understanding images you paste into the chat. It has a different "feel" from Claude — more literal and instruction-following vs Claude\'s more interpretive style.',
    bestFor: [
      'Analyzing a screenshot of a UI and describing what to improve',
      'Generating structured JSON from unstructured text data',
      'Following a detailed multi-step prompt template precisely',
      'Extracting specific fields from a document or image',
      'Writing code that needs to conform to a very specific schema or format',
      'Processing a chart or graph image and describing the data patterns',
    ],
    limitations: [
      'Knowledge cutoff — no real-time web access by default',
      'Cannot generate images (only analyze them)',
      'Slightly less nuanced in pure writing quality vs Claude Sonnet',
      '128K context window (smaller than Claude/Gemini)',
    ],
    pricingContext: 'At $2.50 input / $10.00 output per 1M tokens, a typical message costs roughly $0.006. With $10 you could have about 1,600 conversations.',
    vsClaudeSonnet: 'Pick GPT-4o when you\'re working with images, need strict JSON/schema output, or prefer the more literal instruction-following style. For pure writing and reasoning, Claude Sonnet is often better.',
  },
  'openai/gpt-4o-mini': {
    fullDescription: 'GPT-4o Mini delivers approximately 94% of GPT-4o\'s capability at roughly 15x lower cost. It\'s OpenAI\'s sweet spot for everyday tasks — fast enough to feel instant, smart enough for most professional use cases, and cheap enough to use freely. It retains the same instruction-following strengths as its big sibling and supports image input as well.',
    bestFor: [
      'Writing a cold outreach email for a sales campaign',
      'Answering a customer support question from a knowledge base you paste in',
      'Summarizing a long article or document quickly',
      'Generating social media post variations from a brief',
      'Simple data processing and transformation tasks',
      'Drafting a first version of any document that you\'ll refine yourself',
    ],
    limitations: [
      'Less capable on complex reasoning than GPT-4o',
      'May oversimplify nuanced writing tasks',
      'No real-time web access',
      '128K context window',
    ],
    pricingContext: 'At $0.15 input / $0.60 output per 1M tokens, a typical message costs roughly $0.00038. With $10 you could send about 26,000 messages — essentially unlimited for normal use.',
    vsClaudeSonnet: 'GPT-4o Mini is the right choice when you want OpenAI quality on a budget. For complex or nuanced tasks, step up to GPT-4o or Claude Sonnet.',
  },
  'openai/o3-mini': {
    fullDescription: 'o3 Mini is OpenAI\'s compact reasoning model — part of the "o-series" that thinks step-by-step before answering. Unlike standard language models that answer immediately, o-series models internally work through problems, which dramatically improves accuracy on math, logic, science, and coding challenges. The "mini" version makes this capability accessible at a more reasonable price point.',
    bestFor: [
      'Solving a multi-step calculus or statistics problem',
      'Debugging complex logic errors in code where the bug isn\'t obvious',
      'Working through a financial model or projection step by step',
      'Analyzing a competitive scenario with multiple interacting factors',
      'Solving interview-style coding/algorithm problems',
      'Verifying whether a proof or argument is logically sound',
    ],
    limitations: [
      'Slower than standard models due to internal reasoning',
      'Overkill for simple questions — wastes time and credits',
      'No real-time web access',
      'Cannot process images',
    ],
    pricingContext: 'At $1.10 input / $4.40 output per 1M tokens, a typical message costs roughly $0.0027. With $10 you\'d get about 3,700 conversations — good value for the reasoning capability you get.',
    vsClaudeSonnet: 'Use o3 Mini when accuracy on math or logic is paramount and you\'re OK with a slower response. Claude Sonnet is faster and better for writing; o3 Mini is better for step-by-step problem solving.',
  },
  'openai/o3': {
    fullDescription: 'o3 is OpenAI\'s most powerful reasoning model — the pinnacle of the o-series. It scored at PhD-level on science benchmarks and near-perfect on the hardest math competitions. It spends significantly more time "thinking" before responding, producing answers that reflect deeper analysis than any other model on the platform. Reserved for the cases where accuracy is everything and you can wait for the answer.',
    bestFor: [
      'Solving advanced mathematics (olympiad-level problems)',
      'Designing a complex software system architecture from scratch',
      'Analyzing a machine learning model\'s behavior and diagnosing failures',
      'Working through a multi-step physics or chemistry problem',
      'Reviewing a critical piece of infrastructure code for subtle bugs',
      'Evaluating the logical validity of a complex business argument',
    ],
    limitations: [
      'Noticeably slow — can take 30-60 seconds for complex problems',
      'More expensive than o3 Mini',
      'No real-time web access',
      'Cannot process images',
      'Overkill for everyday tasks',
    ],
    pricingContext: 'At $2.00 input / $8.00 output per 1M tokens, a typical message costs roughly $0.005. Competitive with GPT-4o but much more capable for reasoning tasks.',
    vsClaudeSonnet: 'o3 is purpose-built for reasoning-heavy tasks. Claude Sonnet is better for writing, analysis, and fast work. o3 is the right choice when you\'re solving a hard math or logic problem and need the right answer.',
  },
  'x-ai/grok-3': {
    fullDescription: 'Grok 3 is xAI\'s flagship model, built with the character of being direct and uncensored where other AI might hedge. It has native access to real-time web data, making it uniquely capable for questions about current events. It was built on a massive 100K GPU cluster and rivals the frontier models from Anthropic and OpenAI on benchmarks. Grok has a noticeably different "personality" — more willing to engage with edgy or controversial topics.',
    bestFor: [
      'Researching what happened in the news this week',
      'Analyzing a stock or company with recent events considered',
      'Getting a direct, unhedged opinion on a controversial topic',
      'Large-scale reasoning tasks with long chains of thought',
      'Understanding current market conditions or recent tech releases',
      'Coding tasks where you want a "no excuses" style response',
    ],
    limitations: [
      'Real-time web access means responses can sometimes be inconsistent',
      'Smaller context window than Claude/Gemini (131K)',
      'Cannot generate images',
      'May sometimes be too blunt for professional communications',
    ],
    pricingContext: 'At $3.00 input / $15.00 output per 1M tokens, pricing matches Claude Sonnet. The real-time web access is a significant value-add at this price point.',
    vsClaudeSonnet: 'Choose Grok 3 when real-time web data matters, when you want a more direct/unfiltered perspective, or for current events research. Claude Sonnet is better for nuanced writing and creative tasks.',
  },
  'x-ai/grok-3-mini': {
    fullDescription: 'Grok 3 Mini is the lighter, faster, cheaper version of Grok 3. It retains the real-time web access and direct communication style that makes Grok distinctive, but at a fraction of the cost. Great for quick lookups, current event summaries, and social media content where you want Grok\'s personality without the flagship price tag.',
    bestFor: [
      'Quick lookups for recent news or current data',
      'Generating social media content with a punchy, direct tone',
      'Fast answers to time-sensitive questions',
      'Summarizing recent developments on a topic',
      'Budget-friendly research tasks where recency matters',
      'Casual, conversational questions where personality matters',
    ],
    limitations: [
      'Less capable than Grok 3 on complex reasoning',
      'May miss nuance on complicated tasks',
      '131K context window',
      'Cannot generate images',
    ],
    pricingContext: 'At $0.30 input / $0.50 output per 1M tokens, this is one of the cheapest models with real-time web access. With $10 you could get about 10,000+ quick searches.',
    vsClaudeSonnet: 'Grok 3 Mini is ideal when you need live web data cheaply and quickly. Claude Sonnet wins on writing quality, nuance, and pure reasoning depth.',
  },
  'deepseek/deepseek-chat-v3-0324': {
    fullDescription: 'DeepSeek V3 is the model that shocked the AI industry in early 2025 — trained for a fraction of the cost of GPT-4o and matching it on most benchmarks. Built by a Chinese AI lab, it uses a Mixture of Experts (MoE) architecture that activates only the most relevant parts of the model for each task, making it extraordinarily efficient. It\'s the default model on Ched for a reason: exceptional quality at a price that makes it viable for constant daily use.',
    bestFor: [
      'Writing a complete Python script from a natural language description',
      'Cleaning and transforming a messy dataset with specific rules',
      'Drafting a business email, proposal, or report',
      'Answering detailed questions about a topic you paste into the chat',
      'Building out a feature spec from a rough idea',
      'Everyday Q&A, research, and task automation',
    ],
    limitations: [
      'Smaller context window (64K tokens) — can\'t process very long documents',
      'No real-time web access',
      'Cannot generate or analyze images',
      'Chinese lab — some users have data privacy concerns',
    ],
    pricingContext: 'At $0.27 input / $1.10 output per 1M tokens, a typical message costs roughly $0.00068. With $10 you could have about 14,700 conversations. This is why it\'s the default.',
    vsClaudeSonnet: 'DeepSeek V3 is the right call for 90% of tasks — same quality, 4-10x cheaper. Use Claude Sonnet when you need the extra nuance on complex writing or longer documents.',
  },
  'deepseek/deepseek-r1': {
    fullDescription: 'DeepSeek R1 is DeepSeek\'s reasoning model — the answer to OpenAI\'s o1 series, but at a fraction of the cost. It uses reinforcement learning to develop genuine chain-of-thought reasoning, making it exceptional at math, science, and logic. It was one of the biggest surprises in the AI industry: matching o1\'s reasoning benchmarks at 20-30x lower cost. It actually shows its reasoning process, so you can follow along as it solves a problem.',
    bestFor: [
      'Solving calculus, statistics, or linear algebra problems step by step',
      'Working through a logic puzzle or interview brain teaser',
      'Analyzing a complex algorithm for correctness and edge cases',
      'Breaking down a physics or chemistry problem methodically',
      'Finding the logical flaw in a business argument or proposal',
      'Proof-checking mathematical derivations',
    ],
    limitations: [
      'Slower than non-reasoning models due to chain-of-thought processing',
      'Smaller context window (64K tokens)',
      'No real-time web access',
      'Cannot process images',
      'Overkill for tasks that don\'t need step-by-step reasoning',
    ],
    pricingContext: 'At $0.55 input / $2.19 output per 1M tokens, it\'s roughly 20x cheaper than OpenAI\'s o1/o3 for equivalent reasoning. With $10 you get about 4,500 reasoning conversations.',
    vsClaudeSonnet: 'DeepSeek R1 is for math and logic problems. Claude Sonnet is for writing, research, and analysis. They\'re complementary — use R1 when you need step-by-step correctness, Sonnet for everything else.',
  },
  'deepseek/deepseek-r1-0528': {
    fullDescription: 'DeepSeek R1 (May \'28 update) is the refined version of the original R1, released in May 2025. It improves on the original with better instruction following, reduced errors, and more reliable step-by-step reasoning. It outperforms the original R1 on most benchmarks while maintaining the same exceptional price. If you were going to use R1, use this one instead.',
    bestFor: [
      'Same tasks as DeepSeek R1, with improved accuracy',
      'Mathematical proofs and derivations',
      'Complex debugging sessions requiring logical trace-through',
      'Scientific problem solving in STEM fields',
      'Algorithm design and analysis',
      'Verifying the correctness of complex reasoning chains',
    ],
    limitations: [
      'Same limitations as original R1 — slow, 64K context, no images',
      'No real-time web access',
      'Not meaningfully better on writing or casual tasks',
    ],
    pricingContext: 'At $0.50 input / $2.15 output per 1M tokens — similar to the original R1, marginally cheaper. With $10 you get about 4,600 reasoning conversations.',
    vsClaudeSonnet: 'This updated R1 is strictly better than the original for reasoning tasks. For writing, analysis, and anything requiring nuance or creativity, Claude Sonnet still wins.',
  },
  'google/gemini-2.5-pro-preview': {
    fullDescription: 'Gemini 2.5 Pro is Google\'s smartest model and the one with the most context in the world — 1 million tokens. That means you can paste in an entire book, a massive codebase, or a year of meeting notes and have a conversation about it. It\'s genuinely multimodal (text, images, audio, video), built on Google\'s latest research, and rivals Anthropic and OpenAI on most benchmarks. The 1M context is its defining superpower.',
    bestFor: [
      'Analyzing an entire codebase at once (paste the whole thing in)',
      'Summarizing a 300-page document or research report',
      'Having a conversation about hours of meeting transcripts',
      'Cross-referencing multiple long documents to find patterns',
      'Analyzing a video or audio recording',
      'Long, iterative projects where you need the full history in context',
    ],
    limitations: [
      'Slower and more expensive than Gemini Flash',
      'Preview model — may have occasional inconsistencies',
      'No real-time web search (without using grounding)',
      'Cannot generate images or audio',
    ],
    pricingContext: 'At $1.25 input / $10.00 output per 1M tokens, the per-message cost depends heavily on how much context you send. For a normal message, ~$0.005. For a massive document analysis, it could be $0.10-$0.50 — still far cheaper than alternatives.',
    vsClaudeSonnet: 'Gemini 2.5 Pro wins when document length is the constraint. Claude Sonnet has a 200K context vs Gemini\'s 1M. If your document fits in 200K, Sonnet is usually better quality. If it doesn\'t, Gemini is the only option.',
  },
  'google/gemini-2.0-flash-001': {
    fullDescription: 'Gemini 2.0 Flash is the fastest model on the platform — Google built it for latency. It processes text, images, audio, and video at speeds that feel almost instant. The quality is lower than Gemini Pro, but for tasks where you need an answer in under a second and the task isn\'t deeply complex, it\'s unmatched. It also has a 1M token context window despite being the "budget" option.',
    bestFor: [
      'Quick factual lookups where speed is the priority',
      'Rapid iteration on drafts where you\'re generating many versions quickly',
      'High-volume tasks where you need to process many items fast',
      'Simple Q&A in a time-sensitive setting',
      'Analyzing an image quickly (what\'s in this photo?)',
      'Low-latency chatbot-style interactions',
    ],
    limitations: [
      'Lower quality than Gemini 2.5 Pro on complex tasks',
      'May struggle with nuanced reasoning',
      'No real-time web search by default',
      'Not ideal for long-form writing quality',
    ],
    pricingContext: 'At $0.10 input / $0.40 output per 1M tokens, a typical message costs roughly $0.00025. With $10 you could have about 40,000 conversations — making it the cheapest full-featured model on the platform.',
    vsClaudeSonnet: 'Gemini Flash is for speed and volume. Claude Sonnet is for quality. If you just need a fast answer and don\'t care about depth, Flash wins every time.',
  },
  'meta-llama/llama-4-maverick': {
    fullDescription: 'Llama 4 Maverick is Meta\'s latest open-source flagship — and it\'s a genuine contender. Open source means the weights are public, which appeals to privacy-conscious users and enterprises. Despite being open source, it delivers performance comparable to GPT-4o at a fraction of the cost, with a massive 1M token context window. Meta\'s Llama series has changed what\'s possible for open AI development.',
    bestFor: [
      'Projects where open-source and reproducibility matter',
      'Coding and analysis tasks at low cost',
      'Privacy-sensitive use cases (the model can be self-hosted)',
      'Long document processing at low cost (1M context)',
      'Organizations with data residency requirements',
      'Developers who want to fine-tune a model on their own data',
    ],
    limitations: [
      'No real-time web access',
      'Cannot process images in this deployment',
      'Slightly less polished on pure writing quality vs Claude',
      'Open source doesn\'t mean unlimited — API usage still costs credits',
    ],
    pricingContext: 'At $0.15 input / $0.60 output per 1M tokens, matches GPT-4o Mini pricing but with 1M context. With $10 you could have about 13,000+ conversations.',
    vsClaudeSonnet: 'Llama 4 Maverick is the open-source alternative. Choose it when you want budget pricing, need the 1M context window, or have philosophical preference for open models. Sonnet still leads on writing quality.',
  },
  'meta-llama/llama-3.3-70b-instruct': {
    fullDescription: 'Llama 3.3 70B is Meta\'s proven workhorse — the 70-billion parameter model that established Meta as a credible AI lab. It\'s been battle-tested by the open source community for over a year. While the newer Llama 4 Maverick is more capable, the 3.3 70B has a longer track record, more community tooling, and strong performance across coding, writing, and analysis at a very low price.',
    bestFor: [
      'Reliable everyday tasks where you want a tested, proven model',
      'Coding and scripting tasks at minimal cost',
      'Applications where you need a stable, well-characterized model',
      'Privacy-focused use cases (open weights)',
      'Bulk document processing where cost is the primary constraint',
      'Teams comfortable with slightly lower capability for significantly lower cost',
    ],
    limitations: [
      'Superseded by Llama 4 Maverick in most areas',
      'Smaller context window (128K vs 1M for Llama 4)',
      'No real-time web access',
      'Cannot process images',
    ],
    pricingContext: 'At $0.10 input / $0.32 output per 1M tokens — one of the cheapest models available. With $10 you could have roughly 21,000 conversations.',
    vsClaudeSonnet: 'This is a budget fallback. For quality work, use Claude Sonnet. For open-source at minimal cost, use Llama 3.3 70B or upgrade to Llama 4 Maverick.',
  },
  'minimax/minimax-m2.5': {
    fullDescription: 'MiniMax M2.5 is MiniMax\'s latest release and arguably the cheapest capable AI on the market. Built by a Chinese startup, it combines a massive 1M token context window with pricing that undercuts nearly everything else. It\'s not the sharpest tool in the box for complex reasoning, but for long document processing, bulk tasks, and budget-conscious daily use, it delivers solid results at pennies per query.',
    bestFor: [
      'Processing very long documents at minimal cost',
      'Bulk content generation where cost matters more than perfection',
      'Summarizing large collections of text',
      'Experimenting with AI on a tight budget',
      'High-volume use cases where per-query cost is the bottleneck',
      'Simple Q&A on long documents',
    ],
    limitations: [
      'Less capable on complex reasoning than top-tier models',
      'Chinese lab — data privacy considerations',
      'May struggle with sophisticated writing tasks',
      'Less community track record than Claude/GPT/Gemini',
    ],
    pricingContext: 'At $0.15 input / $1.15 output per 1M tokens, it\'s remarkably cheap for a 1M context model. With $10 you can process enormous amounts of text.',
    vsClaudeSonnet: 'Use MiniMax M2.5 when you have very long documents and a tight budget. Claude Sonnet wins on quality — reserve M2.5 for volume tasks.',
  },
  'minimax/minimax-m1': {
    fullDescription: 'MiniMax M1 is MiniMax\'s flagship model with extended thinking capability — it can reason step by step on hard problems while still offering the massive 1M token context window the company is known for. It\'s a surprisingly capable model for the price, particularly strong at math and coding. It fills the niche of "reasoning model with huge context" that few other models occupy.',
    bestFor: [
      'Math and coding problems where you need step-by-step reasoning on long documents',
      'Analyzing large datasets or long logs for patterns',
      'Complex multi-step tasks on very long text inputs',
      'Budget-friendly alternative to Claude Opus for long documents',
      'Research synthesis from many long source documents',
      'Coding projects where you want to include the full codebase in context',
    ],
    limitations: [
      'Less polished than top-tier models on pure writing',
      'Chinese lab — data privacy considerations',
      'Slower when using extended thinking mode',
      'Less proven than Anthropic/OpenAI flagship models',
    ],
    pricingContext: 'At $0.40 input / $2.20 output per 1M tokens, it\'s competitive for a reasoning model with massive context. Compare: OpenAI o3 is $2.00/$8.00 for 200K context; MiniMax M1 gives you 1M context for far less.',
    vsClaudeSonnet: 'MiniMax M1 is unique in combining reasoning ability with 1M context at low cost. Claude Sonnet wins on writing quality and reliability. Use M1 when you need both reasoning and long-form input on a budget.',
  },
  'perplexity/sonar-pro': {
    fullDescription: 'Perplexity Sonar Pro is the only model on the platform purpose-built for real-time web search. Every answer is grounded in live web results with citations you can verify. It doesn\'t just add web access to a language model — it\'s redesigned around the search-and-answer paradigm. If you need current information, recent news, or factual claims about the world today, Sonar Pro is the only model that can deliver reliably.',
    bestFor: [
      'Researching what a company announced in their earnings call this week',
      'Fact-checking a claim with current, citable sources',
      'Finding the latest statistics or research in a field',
      'Getting a summary of today\'s news in a specific industry',
      'Competitive research on what rivals are doing right now',
      'Answering "what\'s the current state of X?" questions',
    ],
    limitations: [
      'More expensive than general-purpose models',
      'Less capable than Claude/GPT on pure writing or reasoning without web content',
      'Search grounding means answers can vary between queries',
      'Cannot generate images or process media',
    ],
    pricingContext: 'At $3.00 input / $15.00 output per 1M tokens, it matches Claude Sonnet pricing. The real-time search capability is the value-add — for current events research, it\'s worth every credit.',
    vsClaudeSonnet: 'Sonar Pro wins whenever recency matters. Claude Sonnet wins on everything else. If your question could be fully answered from information before 2024, use Sonnet. If it requires today\'s data, use Sonar Pro.',
  },
  'mistralai/mistral-large-2512': {
    fullDescription: 'Mistral Large is France\'s answer to GPT-4 — built by a Paris-based AI lab with a focus on European compliance, privacy, and multilingual capability. It processes 80+ languages natively and is one of the few models where GDPR compliance and data residency in Europe are part of the architecture, not an afterthought. For European enterprises, regulated industries, or multilingual content, it\'s the model to reach for.',
    bestFor: [
      'Drafting documents in French, German, Spanish, Italian, or other European languages',
      'Business writing for audiences where GDPR compliance is required',
      'Processing multilingual customer feedback or support tickets',
      'Legal or compliance documents requiring European regulatory alignment',
      'Translating and localizing content across European markets',
      'Organizations with strict data sovereignty requirements',
    ],
    limitations: [
      'Less capable than Claude/GPT on English-only tasks',
      'No real-time web access',
      'Cannot process images',
      'Smaller context window than Gemini or Meta models',
    ],
    pricingContext: 'At $0.50 input / $1.50 output per 1M tokens, it\'s affordable for a capable model. With $10 you could have about 5,000 multilingual conversations.',
    vsClaudeSonnet: 'Use Mistral Large for multilingual, European compliance, or regulated industry use cases. Claude Sonnet is the better all-around model for English tasks.',
  },
}

function RatingBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  const pct = (value / max) * 100
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono text-white/50 w-8 text-right">{value}/10</span>
    </div>
  )
}

function ModelCard({ model }: { model: AIModel }) {
  const [expanded, setExpanded] = useState(false)
  const guide = MODEL_GUIDE[model.id]
  const msgsPerDollar = Math.round(1 / ((model.costPer1MInput * 0.0005 + model.costPer1MOutput * 0.0005)))

  return (
    <div className="bg-[#1a1a1a] border border-white/8 rounded-2xl overflow-hidden">
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

        {/* IQ bar */}
        <div className="space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-[10px] text-white/30">
            <span>Intelligence</span>
          </div>
          <RatingBar value={model.intelligenceRating} color={model.providerColor} />
          <div className="flex items-center justify-between text-[10px] text-white/30">
            <span>Speed</span>
          </div>
          <RatingBar value={model.speedRating} color="#22c55e" />
        </div>

        {/* Pricing */}
        <div className="flex items-center justify-between bg-white/4 rounded-xl px-3 py-2.5">
          <div>
            <p className="text-xs font-mono text-white/60">${model.costPer1MInput} in · ${model.costPer1MOutput} out</p>
            <p className="text-[10px] text-white/30 mt-0.5">per 1M tokens</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white/70">~{msgsPerDollar.toLocaleString()}</p>
            <p className="text-[10px] text-white/30">msgs / $1</p>
          </div>
        </div>
      </div>

      {/* Expandable section */}
      {guide && (
        <>
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-full flex items-center justify-between px-5 py-3 bg-white/2 border-t border-white/5 hover:bg-white/4 transition-colors"
          >
            <span className="text-xs text-white/40 font-medium">Full guide — best for, limitations, pricing context</span>
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
                  Best For
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
                  Limitations
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

              {/* Pricing context */}
              <div className="bg-amber-500/6 border border-amber-500/15 rounded-xl p-3.5">
                <h4 className="text-xs font-semibold text-amber-400/80 uppercase tracking-wider mb-1.5">💰 Pricing in Context</h4>
                <p className="text-sm text-white/55 leading-relaxed">{guide.pricingContext}</p>
              </div>

              {/* vs Claude Sonnet */}
              <div className="bg-indigo-500/6 border border-indigo-500/15 rounded-xl p-3.5">
                <h4 className="text-xs font-semibold text-indigo-400/80 uppercase tracking-wider mb-1.5">⚡ vs Claude Sonnet</h4>
                <p className="text-sm text-white/55 leading-relaxed">{guide.vsClaudeSonnet}</p>
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

const COMPARISON_ROWS = [
  { label: 'Best All-Purpose', model: 'DeepSeek V3', note: 'Fast, cheap, smart' },
  { label: 'Best Writing', model: 'Claude Sonnet', note: 'Nuance + long-form' },
  { label: 'Best Reasoning', model: 'DeepSeek R1 / o3', note: 'Math & logic' },
  { label: 'Best Speed', model: 'Gemini 2.0 Flash', note: 'Fastest available' },
  { label: 'Best Web Search', model: 'Perplexity Sonar Pro', note: 'Live + cited' },
  { label: 'Best Long Context', model: 'Gemini 2.5 Pro', note: '1M token window' },
  { label: 'Best Budget', model: 'Gemini Flash / Llama', note: '~$0.0001/msg' },
  { label: 'Most Powerful', model: 'Claude Opus', note: 'Maximum intelligence' },
]

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
              Deep dive on every model available in Ched. Understand what each one is built for, where it falls short, and when to use it over Claude Sonnet. {MODELS.length} models across {providers.length} providers.
            </p>
          </div>

          {/* Sticky quick-reference table */}
          <div className="bg-[#111] border border-white/8 rounded-2xl mb-10 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-white/5">
              <h2 className="text-sm font-semibold text-white/70 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                Quick Reference — When to Use What
              </h2>
            </div>
            <div className="divide-y divide-white/5">
              {COMPARISON_ROWS.map(({ label, model, note }) => (
                <div key={label} className="flex items-center px-5 py-3 hover:bg-white/2 transition-colors">
                  <span className="text-xs text-white/35 w-36 flex-shrink-0">{label}</span>
                  <span className="text-sm font-semibold text-white/80 flex-1">{model}</span>
                  <span className="text-xs text-white/35">{note}</span>
                </div>
              ))}
            </div>
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
                    filterProvider === p
                      ? 'text-white/80'
                      : 'text-white/40 hover:text-white/60'
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
              return (
                <section key={provider}>
                  {/* Provider header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: color + '22', color }}>
                      {provider[0]}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white/85">{provider}</h2>
                      <p className="text-xs text-white/30">{providerModels.length} model{providerModels.length > 1 ? 's' : ''} available</p>
                    </div>
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
