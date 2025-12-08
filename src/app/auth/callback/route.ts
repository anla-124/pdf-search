import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const isLocalEnv = process.env.NODE_ENV === 'development'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data?.session) {
      // Ensure session is properly set
      const { data: userData, error: userError } = await supabase.auth.getUser()
      
      if (!userError && userData?.user) {
        // Derive the correct redirect base to preserve the host your users actually used
        const redirectBase = isLocalEnv
          ? origin // Use current origin (e.g., LAN IP) in development
          : forwardedHost
            ? `${forwardedProto || 'https'}://${forwardedHost}`
            : origin

        return NextResponse.redirect(`${redirectBase}${next}`)
      }
    }

    if (error) {
      logger.error('Auth callback error', error as Error, { code: code?.substring(0, 10) })
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
