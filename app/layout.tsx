import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI Hub — alexkedwell.com',
  description: 'Chat with Claude, GPT-4o, Grok, DeepSeek, Gemini and more. Compare AI models side by side.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950`}>{children}</body>
    </html>
  )
}
