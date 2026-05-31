import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth-helpers'
import { createServiceClient } from '@/lib/supabase'
import { getUserCredits, deductCredits, calculateCost } from '@/lib/credits'
import { MODELS } from '@/lib/models'
import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions'

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  const { id: roomId } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createServiceClient()

  // Verify membership
  const { data: member } = await db
    .from('chat_room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 })

  const { data: messages, error } = await db
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(messages || [])
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: roomId } = await params
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { content, modelId = 'deepseek/deepseek-chat' } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Message content required' }, { status: 400 })

  const db = createServiceClient()

  // Verify membership
  const { data: member } = await db
    .from('chat_room_members')
    .select('user_id')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .single()

  if (!member) return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 })

  // Insert user message
  const { data: userMsg, error: insertError } = await db
    .from('chat_messages')
    .insert({ room_id: roomId, user_id: user.id, content: content.trim(), is_ai: false })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Check if @ched is mentioned → trigger AI response
  const mentionsChed = content.toLowerCase().includes('@ched')

  if (mentionsChed) {
    // Check credits
    const credits = await getUserCredits(user.id)
    if (credits.balance_usd <= 0) {
      return NextResponse.json({
        userMessage: userMsg,
        aiMessage: null,
        error: 'Insufficient credits for AI response',
      })
    }

    // Fetch conversation history for context
    const { data: history } = await db
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(20)

    const historyMessages: ChatCompletionMessageParam[] = (history || []).map(m => ({
      role: (m.is_ai ? 'assistant' : 'user') as 'assistant' | 'user',
      content: m.content,
    }))

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json({ userMessage: userMsg, aiMessage: null, error: 'API key not configured' })
    }

    const model = MODELS.find(m => m.id === modelId)
    const costPer1MInput = model?.costPer1MInput ?? 1.0
    const costPer1MOutput = model?.costPer1MOutput ?? 3.0

    const openrouter = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://alexkedwell.com',
        'X-Title': 'AlexKedwell AI Hub',
      },
    })

    try {
      const completion = await openrouter.chat.completions.create({
        model: modelId,
        messages: [
          { role: 'system', content: 'You are Ched, a helpful AI assistant in a group chat. Be concise and friendly.' },
          ...historyMessages,
        ],
        max_tokens: 1024,
      })

      const aiContent = completion.choices[0]?.message?.content ?? ''
      const inputTokens = completion.usage?.prompt_tokens ?? 0
      const outputTokens = completion.usage?.completion_tokens ?? 0
      const cost = calculateCost(inputTokens, outputTokens, costPer1MInput, costPer1MOutput)

      await deductCredits(user.id, cost)

      const { data: aiMsg } = await db
        .from('chat_messages')
        .insert({ room_id: roomId, user_id: user.id, content: aiContent, is_ai: true })
        .select()
        .single()

      return NextResponse.json({ userMessage: userMsg, aiMessage: aiMsg })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI error'
      return NextResponse.json({ userMessage: userMsg, aiMessage: null, error: msg })
    }
  }

  return NextResponse.json({ userMessage: userMsg, aiMessage: null })
}
