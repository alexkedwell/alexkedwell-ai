import { createServiceClient } from './supabase'

const MARKUP = 1.0625 // 6.25% markup

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  costPer1MInput: number,
  costPer1MOutput: number
): number {
  const inputCost = (inputTokens / 1_000_000) * costPer1MInput
  const outputCost = (outputTokens / 1_000_000) * costPer1MOutput
  return (inputCost + outputCost) * MARKUP
}

export async function getUserCredits(userId: string) {
  const db = createServiceClient()
  const { data, error } = await db
    .from('user_credits')
    .select('balance_usd, total_spent')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    // Create a default record
    await db.from('user_credits').upsert({ id: userId, balance_usd: 0, total_spent: 0 }, { ignoreDuplicates: true })
    return { balance_usd: 0, total_spent: 0 }
  }
  return data
}

export async function deductCredits(userId: string, amount: number): Promise<{ success: boolean; newBalance: number }> {
  const db = createServiceClient()
  
  // Get current balance
  const { data: credits } = await db
    .from('user_credits')
    .select('balance_usd, total_spent')
    .eq('id', userId)
    .single()
  
  const currentBalance = credits?.balance_usd ?? 0
  const currentSpent = credits?.total_spent ?? 0
  
  if (currentBalance < amount) {
    return { success: false, newBalance: currentBalance }
  }
  
  const newBalance = Math.max(0, currentBalance - amount)
  const newSpent = currentSpent + amount
  
  await db
    .from('user_credits')
    .upsert({
      id: userId,
      balance_usd: newBalance,
      total_spent: newSpent,
      updated_at: new Date().toISOString(),
    })
  
  return { success: true, newBalance }
}

export async function addCredits(userId: string, amount: number): Promise<number> {
  const db = createServiceClient()
  
  const { data: credits } = await db
    .from('user_credits')
    .select('balance_usd')
    .eq('id', userId)
    .single()
  
  const currentBalance = credits?.balance_usd ?? 0
  const newBalance = currentBalance + amount
  
  await db
    .from('user_credits')
    .upsert({
      id: userId,
      balance_usd: newBalance,
      updated_at: new Date().toISOString(),
    })
  
  return newBalance
}
