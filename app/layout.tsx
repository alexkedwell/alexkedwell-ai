import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Ched — AI Chat',
  description: 'Chat with Claude, GPT-4o, Grok, DeepSeek, Gemini and more.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950`}>{children}</body>
    </html>
  )
}
// force redeploy Sun May 31 02:29:08 EDT 2026
