/**
 * Load More Keyword Pages API Endpoint
 *
 * POST /api/documents/keyword-search/load-more-pages
 *
 * Loads additional matching pages for a specific document in a keyword search.
 * Used for "Show more" functionality to expand beyond initial page limit.
 *
 * Features:
 * - Re-runs search filtered to single document
 * - Returns next batch of matching pages
 * - Maintains consistent ranking with original search
 *
 * Security:
 * - Requires authentication
 * - Verifies user owns the document
 * - Uses parameterized queries
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import type {
  LoadMorePagesRequest,
  LoadMorePagesResponse,
  KeywordMatch
} from '@/types/search'

/**
 * POST /api/documents/keyword-search/load-more-pages
 *
 * Load additional matching pages for a document
 */
export async function POST(request: NextRequest) {
  try {
    // ========================================================================
    // 1. AUTHENTICATION
    // ========================================================================

    const supabase = await createClient()

    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      )
    }

    // ========================================================================
    // 2. PARSE & VALIDATE REQUEST
    // ========================================================================

    let body: Partial<LoadMorePagesRequest>

    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const {
      documentId,
      query,
      skipPages = 3,
      fetchPages = 5
    } = body

    // Validate documentId
    if (!documentId || typeof documentId !== 'string') {
      return NextResponse.json(
        { error: 'documentId is required and must be a string' },
        { status: 400 }
      )
    }

    // Validate query
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'query is required and cannot be empty' },
        { status: 400 }
      )
    }

    const trimmedQuery = query.trim()

    // Validate pagination params
    if (
      typeof skipPages !== 'number' ||
      skipPages < 0
    ) {
      return NextResponse.json(
        { error: 'skipPages must be >= 0' },
        { status: 400 }
      )
    }

    if (
      typeof fetchPages !== 'number' ||
      fetchPages < 1 ||
      fetchPages > 20
    ) {
      return NextResponse.json(
        { error: 'fetchPages must be between 1 and 20' },
        { status: 400 }
      )
    }

    // ========================================================================
    // 3. VERIFY DOCUMENT OWNERSHIP
    // ========================================================================

    // Verify user owns this document
    const { data: docCheck, error: docError } = await supabase
      .from('documents')
      .select('id, user_id, status')
      .eq('id', documentId)
      .single()

    if (docError || !docCheck) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (docCheck.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized - You do not own this document' },
        { status: 403 }
      )
    }

    if (docCheck.status !== 'completed') {
      return NextResponse.json(
        { error: 'Document is not ready for search' },
        { status: 400 }
      )
    }

    // ========================================================================
    // 4. LOAD ADDITIONAL PAGES
    // ========================================================================

    const { data, error } = await supabase.rpc('get_additional_keyword_pages', {
      p_user_id: user.id,
      p_document_id: documentId,
      p_search_query: trimmedQuery,
      p_skip_pages: skipPages,
      p_fetch_pages: fetchPages
    })

    if (error) {
      logger.error('Load more pages database error', new Error(error.message), {
        code: error.code,
        details: error.details,
        document_id: documentId,
        user_id: user.id
      })

      return NextResponse.json(
        { error: 'Failed to load more pages. Please try again.' },
        { status: 500 }
      )
    }

    // ========================================================================
    // 5. TRANSFORM RESULTS
    // ========================================================================

    const pages = (data || []) as Array<{
      page_number: number
      excerpt: string
      score: number
    }>

    const matches: KeywordMatch[] = pages.map(page => ({
      pageNumber: page.page_number,
      excerpt: page.excerpt,
      score: page.score
    }))

    const response: LoadMorePagesResponse = {
      documentId,
      pages: matches,
      // If we got exactly fetchPages results, there might be more
      hasMore: matches.length === fetchPages
    }

    // ========================================================================
    // 6. RETURN RESPONSE
    // ========================================================================

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=300'
      }
    })
  } catch (error) {
    logger.error(
      'Unexpected error in load more pages',
      error instanceof Error ? error : new Error(String(error)),
      {
        stack: error instanceof Error ? error.stack : undefined
      }
    )

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS'
    }
  })
}
