import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

function getClient() {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY || 'placeholder',
    defaultHeaders: {
      'HTTP-Referer': 'https://alexkedwell.com',
      'X-Title': 'AlexKedwell AI Hub',
    },
  })
}

export async function POST(req: NextRequest) {
  const { messages, modelId } = await req.json()
  if (!messages || !modelId) {
    return NextResponse.json({ error: 'Missing messages or modelId' }, { status: 400 })
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey || apiKey === 'placeholder' || apiKey.startsWith('sk-or-placeholder')) {
    return NextResponse.json({ error: 'OpenRouter API key not configured. Please set OPENROUTER_API_KEY in your environment.' }, { status: 503 })
  }

  const openrouter = getClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const completion = await openrouter.chat.completions.create({
          model: modelId,
          messages,
          stream: true,
          max_tokens: 4096,
        })
        for await (const chunk of completion) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
