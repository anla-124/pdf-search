import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fetches the user role from the public.users table
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch role for
 * @returns User role ('admin' | 'user') or null if not found
 */
export async function getUserRole(
  supabase: SupabaseClient,
  userId: string
): Promise<'admin' | 'user' | null> {
  const { data: user, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user role:', error)
    return null
  }

  return user?.role ?? null
}
