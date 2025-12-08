import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Authenticate request (supports JWT, service role, and cookies)
    const authResult = await authenticateRequest(request)
    if (authResult instanceof NextResponse) {
      return authResult // Return error response
    }

    const { supabase } = authResult

    // Get document to check ownership and get file path
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('file_path, filename, content_type')
      .eq('id', id)
      .single<{ file_path: string | null; filename: string | null; content_type: string | null }>()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Document not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
    }

    // Download file from Supabase storage
    const filePath = typeof document.file_path === 'string' ? document.file_path : null
    if (!filePath) {
      return NextResponse.json({ error: 'Document file path is missing' }, { status: 500 })
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath)

    if (downloadError || !fileData) {
      logger.error('Storage download error', downloadError as Error, { documentId: id, filePath })
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Return the file as a blob
    const contentType = typeof document.content_type === 'string' ? document.content_type : 'application/pdf'
    const filename = typeof document.filename === 'string' ? document.filename : `${id}.pdf`

    return new NextResponse(fileData, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileData.size.toString(),
      },
    })

  } catch (error) {
    logger.error('Document download error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
