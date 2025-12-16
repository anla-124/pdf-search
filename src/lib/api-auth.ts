import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { unauthorizedError } from '@/lib/utils/api-response'
import { logger } from '@/lib/logger'
import { getUserRole } from '@/lib/user-role'

export interface AuthResult {
  userId: string
  supabase: Awaited<ReturnType<typeof createServerClient>>
  isServiceRole?: boolean
}

/**
 * Authenticate API request using JWT token or cookie-based session
 *
 * Supports two authentication methods:
 * 1. JWT token from Authorization header (for API clients/tests)
 * 2. Cookie-based session (for regular browser requests)
 */
export async function authenticateRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  // Method 1: JWT token authentication (for API clients/tests)
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '')
    const { createClient: createAnonClient } = await import('@supabase/supabase-js')

    // Create client with anon key
    const anonClient = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Validate the token and get user
    const { data: { user: validatedUser }, error: validateError } = await anonClient.auth.getUser(token)

    if (validateError || !validatedUser) {
      logger.error('JWT authentication failed', validateError as Error)
      return unauthorizedError()
    }

    // Create an authenticated client with the token
    // This client will include the Authorization header for all requests
    const authenticatedClient = createAnonClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    logger.info('JWT token authentication used', { userId: validatedUser.id })

    return {
      userId: validatedUser.id,
      supabase: authenticatedClient,
      isServiceRole: false
    }
  }

  // Method 2: Cookie-based authentication (regular browser requests)
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return unauthorizedError()
  }

  return {
    userId: user.id,
    supabase,
    isServiceRole: false
  }
}

/**
 * Authenticate and verify admin role for API request
 *
 * This function first authenticates the request, then checks if the user
 * has an admin role in the public.users table.
 *
 * @returns AuthResult with userId and supabase client if admin, NextResponse with 403 error otherwise
 */
export async function requireAdmin(request: NextRequest) {
  // First, authenticate the request
  const authResult = await authenticateRequest(request)

  // If authentication failed, return the error response
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { userId, supabase } = authResult

  // Check if user has admin role
  const role = await getUserRole(supabase, userId)

  if (role !== 'admin') {
    logger.warn('Admin access denied', { userId, role })
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    )
  }

  logger.info('Admin access granted', { userId })

  return {
    userId,
    supabase,
    role: 'admin' as const,
    isServiceRole: false
  }
}
