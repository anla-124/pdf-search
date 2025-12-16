import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Disable caching for this route
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/metadata/options
 *
 * Fetch metadata options for dropdowns
 * Query parameters:
 * - category: Filter by category (law_firm, fund_manager, fund_admin, jurisdiction)
 * - status: Filter by status (default: 'approved')
 *
 * Public endpoint for fetching approved options (for dropdowns)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status') || 'approved'

  // Use service role client for public read access to approved options
  const supabase = await createServiceClient()

  let query = supabase
    .from('metadata_options')
    .select('id, value, label, status, created_at')
    .order('label')

  // Filter by status
  if (status) {
    query = query.eq('status', status)
  }

  // Filter by category if provided
  if (category) {
    const validCategories = ['law_firm', 'fund_manager', 'fund_admin', 'jurisdiction']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category' },
        { status: 400 }
      )
    }
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching metadata options:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metadata options' },
      { status: 500 }
    )
  }

  // Return with no-cache headers to ensure fresh data
  return NextResponse.json(
    { options: data },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  )
}

/**
 * POST /api/metadata/options
 *
 * Add a new metadata option (admin only, creates as approved)
 *
 * Request body:
 * - category: string (law_firm, fund_manager, fund_admin, jurisdiction)
 * - value: string
 * - label: string (optional, defaults to value)
 */
export async function POST(request: NextRequest) {
  // Require admin authentication
  const { requireAdmin } = await import('@/lib/api-auth')
  const authResult = await requireAdmin(request)
  if (authResult instanceof NextResponse) {
    return authResult
  }

  const { supabase } = authResult

  try {
    const body = await request.json()
    const { category, value, label } = body

    // Validate required fields
    if (!category || !value) {
      return NextResponse.json(
        { error: 'Category and value are required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['law_firm', 'fund_manager', 'fund_admin', 'jurisdiction']
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: law_firm, fund_manager, fund_admin, jurisdiction' },
        { status: 400 }
      )
    }

    // Check if option already exists (any status)
    const { data: existing, error: checkError } = await supabase
      .from('metadata_options')
      .select('id, status')
      .eq('category', category)
      .eq('value', value)
      .maybeSingle()

    if (checkError) {
      console.error('Error checking existing option:', checkError)
      return NextResponse.json(
        { error: 'Failed to check existing option' },
        { status: 500 }
      )
    }

    if (existing) {
      return NextResponse.json(
        { error: 'This option already exists' },
        { status: 409 }
      )
    }

    // Create new approved option (admin-only, no approval needed)
    const { data, error } = await supabase
      .from('metadata_options')
      .insert({
        category,
        value,
        label: label || value,
        status: 'approved'
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating metadata option:', error)
      return NextResponse.json(
        { error: 'Failed to create metadata option' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Metadata option added successfully',
        option: data
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error in POST /api/metadata/options:', error)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
