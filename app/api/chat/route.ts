import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserFromRequest } from '@/lib/auth-helpers'
import { getUserCredits, deductCredits, calculateCost } from '@/lib/credits'
import { createServiceClient } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/crypto'
import { MODELS } from '@/lib/models'

export async function POST(req: NextRequest) {
  const { messages, modelId } = await req.json()
  if (!messages || !modelId) {
    return NextResponse.json({ error: 'Missing messages or modelId' }, { status: 400 })
  }

  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to chat' }, { status: 401 })
  }

  const db = createServiceClient()

  // Check if user has their own OpenRouter API key (BYOK)
  const { data: apiKeyRow } = await db
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('provider', 'openrouter')
    .single()

  let userApiKey: string | null = null
  let isByok = false

  if (apiKeyRow?.encrypted_key) {
    try {
      userApiKey = decryptApiKey(apiKeyRow.encrypted_key, user.id)
      isByok = true
    } catch {
      // Decryption failed - fall through to site key
    }
  }

  // Credit check — only for non-BYOK users
  let credits = { balance_usd: 0, total_spent: 0 }
  if (!isByok) {
    credits = await getUserCredits(user.id)
    if (credits.balance_usd <= 0) {
      return NextResponse.json(
        { error: 'You\'re out of credits. Add more to keep chatting.' },
        { status: 402 }
      )
    }
  }

  // Use user's key (BYOK) or fall back to site key
  const apiKey = isByok ? userApiKey! : process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 })
  }

  const model = MODELS.find(m => m.id === modelId)
  const costPer1MInput = model?.costPer1MInput ?? 1.0
  const costPer1MOutput = model?.costPer1MOutput ?? 3.0

  // Load user's saved context (GitHub, Vercel, preferences, etc.)
  const { data: contextRows } = await db
    .from('user_context')
    .select('key, value')
    .eq('user_id', user.id)

  const userContextBlock = contextRows?.length
    ? `\n\nUser context (remember this across the conversation):\n${contextRows.map(r => `- ${r.key}: ${r.value}`).join('\n')}`
    : ''

  const systemPrompt = `You are Ched, an AI assistant. Be direct, helpful, and concise. If the user asks you to build or deploy something, remember their saved accounts and preferences below.${userContextBlock}`

  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://ched.io',
      'X-Title': 'Ched AI',
    },
  })

  const encoder = new TextEncoder()
  let inputTokens = 0
  let outputTokens = 0

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openrouter.chat.completions.create({
          model: modelId,
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          stream: true,
          max_tokens: 4096,
          stream_options: { include_usage: true },
        })

        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0
            outputTokens = chunk.usage.completion_tokens ?? 0
          }
        }

        // Deduct from user's Ched balance after streaming (skip for BYOK users)
        let newBalance = isByok ? 9999 : credits.balance_usd
        if (!isByok && (inputTokens > 0 || outputTokens > 0)) {
          const cost = calculateCost(inputTokens, outputTokens, costPer1MInput, costPer1MOutput)
          const result = await deductCredits(user.id, cost)
          newBalance = result.newBalance
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ balance: newBalance })}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
