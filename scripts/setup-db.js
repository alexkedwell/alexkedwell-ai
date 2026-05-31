#!/usr/bin/env node
/**
 * DB setup script — runs migrations via Supabase REST API
 * Usage: node scripts/setup-db.js
 */

const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const sql = fs.readFileSync(path.join(__dirname, '../migrations/001_full_schema.sql'), 'utf-8')

async function runSQL(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
    },
    body: JSON.stringify({ query }),
  })
  return res
}

async function main() {
  console.log('Running migrations...')
  
  // Split by semicolon and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const stmt of statements) {
    try {
      const res = await runSQL(stmt + ';')
      if (res.ok) {
        console.log('✓', stmt.slice(0, 60).replace(/\n/g, ' '))
      } else {
        const body = await res.text()
        console.warn('⚠', stmt.slice(0, 60).replace(/\n/g, ' '), '->', body.slice(0, 100))
      }
    } catch (err) {
      console.warn('⚠ Error:', err.message)
    }
  }
  
  console.log('\nMigration complete! Check Supabase dashboard if any warnings above.')
  console.log('SQL file: migrations/001_full_schema.sql')
}

main().catch(console.error)
