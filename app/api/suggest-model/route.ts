import { NextRequest, NextResponse } from 'next/server'

// Rule-based model suggestion — fast, no API call needed
const RULES: { keywords: string[]; modelId: string; reason: string }[] = [
  {
    keywords: ['image', 'picture', 'photo', 'generate image', 'draw', 'dall-e', 'midjourney', 'visual'],
    modelId: 'openai/gpt-5',
    reason: 'GPT-5 supports image generation. Most models on Ched are text-only.',
  },
  {
    keywords: ['math', 'equation', 'calculus', 'algebra', 'statistics', 'proof', 'integral', 'derivative', 'solve for'],
    modelId: 'deepseek/deepseek-r1-0528',
    reason: 'DeepSeek R1 is the best at math — it thinks through problems step by step before answering.',
  },
  {
    keywords: ['code', 'debug', 'function', 'bug', 'error', 'python', 'javascript', 'typescript', 'react', 'sql', 'api', 'build a', 'write a script', 'refactor'],
    modelId: 'deepseek/deepseek-chat-v3-0324',
    reason: 'DeepSeek V3 is exceptional at coding and 10x cheaper than Claude for most code tasks.',
  },
  {
    keywords: ['news', 'today', 'latest', 'current', 'stock price', "what's happening", 'recently', 'search the web', 'look up'],
    modelId: 'perplexity/sonar-pro',
    reason: 'Perplexity Sonar has live web search built in — perfect for current information.',
  },
  {
    keywords: ['reason', 'logic', 'hard problem', 'step by step', 'think through', 'analyze deeply', 'complex'],
    modelId: 'openai/o3',
    reason: 'o3 is OpenAI\'s best reasoning model — it thinks deeply before answering.',
  },
  {
    keywords: ['long document', 'entire file', 'whole codebase', 'book', 'transcript', 'full text', 'entire report'],
    modelId: 'google/gemini-2.5-pro-preview',
    reason: 'Gemini 2.5 Pro has a 1M token context window — ideal for massive documents.',
  },
  {
    keywords: ['quick', 'fast', 'simple question', 'short answer', 'tldr', 'summarize briefly'],
    modelId: 'google/gemini-2.0-flash-001',
    reason: 'Gemini Flash is the fastest model on Ched — great for quick questions.',
  },
  {
    keywords: ['write', 'essay', 'email', 'blog post', 'draft', 'letter', 'proposal', 'report', 'content', 'copy'],
    modelId: 'anthropic/claude-sonnet-4-5',
    reason: 'Claude Sonnet is the best writer — nuanced, precise, and excellent at matching tone.',
  },
  {
    keywords: ['cheap', 'budget', 'save', 'affordable', 'lots of messages', 'bulk'],
    modelId: 'minimax/minimax-m2.5',
    reason: 'MiniMax M2.5 is the cheapest quality model available — great for high-volume use.',
  },
]

export async function POST(req: NextRequest) {
  const { message } = await req.json()
  if (!message || typeof message !== 'string') {
    return NextResponse.json({ suggestion: null })
  }

  const lower = message.toLowerCase()

  for (const rule of RULES) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return NextResponse.json({
        suggestion: {
          modelId: rule.modelId,
          reason: rule.reason,
        }
      })
    }
  }

  return NextResponse.json({ suggestion: null })
}
