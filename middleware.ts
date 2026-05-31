import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PUBLIC_PATHS = ['/login', '/signup', '/auth/', '/onboarding']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths and API routes
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Force onboarding if no OpenRouter key set (skip for onboarding itself)
  if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/api/')) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('openrouter_api_key')
      .eq('id', user.id)
      .single()

    const hasKey = profile?.openrouter_api_key?.trim()
    const hasCredits = !hasKey // check credits only if no key

    // If no key AND not on credits/profile page, check if they have credits
    if (!hasKey && !pathname.startsWith('/credits') && !pathname.startsWith('/profile')) {
      // Redirect new users (no profile row yet) to onboarding
      if (!profile) {
        return NextResponse.redirect(new URL('/onboarding', request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
