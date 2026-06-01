import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getUserFromRequest } from '@/lib/auth-helpers'
import { getUserCredits, deductCredits, calculateCost } from '@/lib/credits'
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

  // Credit check — all users must have credits
  const credits = await getUserCredits(user.id)
  if (credits.balance_usd <= 0) {
    return NextResponse.json(
      { error: 'You\'re out of credits. Add more to keep chatting.' },
      { status: 402 }
    )
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 500 })
  }

  const model = MODELS.find(m => m.id === modelId)
  const costPer1MInput = model?.costPer1MInput ?? 1.0
  const costPer1MOutput = model?.costPer1MOutput ?? 3.0

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
          messages,
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

        // Deduct from user's Ched balance after streaming
        let newBalance = credits.balance_usd
        if (inputTokens > 0 || outputTokens > 0) {
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
