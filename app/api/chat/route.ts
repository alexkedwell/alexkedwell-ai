import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase'
import { decryptApiKey } from '@/lib/crypto'
import { createClient } from '@supabase/supabase-js'

async function getUserApiKey(req: NextRequest): Promise<string | null> {
  // Check for owner fallback key first
  const fallbackKey = process.env.OPENROUTER_API_KEY
  
  // Try to get user from Authorization header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    // No auth token — use fallback if available
    return fallbackKey || null
  }

  const token = authHeader.replace('Bearer ', '')
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error } = await supabaseClient.auth.getUser(token)
  if (error || !user) return fallbackKey || null

  // Look up user's encrypted key
  const db = createServiceClient()
  const { data, error: dbError } = await db
    .from('user_api_keys')
    .select('encrypted_key')
    .eq('user_id', user.id)
    .eq('provider', 'openrouter')
    .single()

  if (dbError || !data) return fallbackKey || null

  try {
    return decryptApiKey(data.encrypted_key, user.id)
  } catch {
    return fallbackKey || null
  }
}

export async function POST(req: NextRequest) {
  const { messages, modelId } = await req.json()
  if (!messages || !modelId) {
    return NextResponse.json({ error: 'Missing messages or modelId' }, { status: 400 })
  }

  const apiKey = await getUserApiKey(req)
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Please add your OpenRouter API key in settings' },
      { status: 401 }
    )
  }

  const openrouter = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'https://alexkedwell.com',
      'X-Title': 'AlexKedwell AI Hub',
    },
  })

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
