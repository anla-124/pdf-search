/**
 * Debug utility for capturing and analyzing raw Document AI responses
 *
 * ACTIVATION: Set DUMP_DOCUMENT_AI=1 in environment variables
 * OUTPUT: Saves JSON files to ./document-ai-debug/<documentId>-<timestamp>.json
 *
 * Use this to:
 * - Understand the full structure of what Document AI returns
 * - Troubleshoot production Document AI processing issues
 * - Analyze paragraph detection, page boundaries, and text extraction
 */

import fs from 'fs/promises'
import path from 'path'
import { DocumentAIDocument } from '@/types/external-apis'
import { logger } from '@/lib/logger'

const DEBUG_OUTPUT_DIR = path.join(process.cwd(), 'document-ai-debug')

/**
 * Save raw Document AI response to a JSON file for inspection
 * Files are saved to /document-ai-debug/<documentId>-<timestamp>.json
 */
export async function saveDocumentAIResponse(
  documentId: string,
  documentAIResult: DocumentAIDocument,
  metadata?: {
    filename?: string
    fileSize?: number
    pageCount?: number
    processor?: string
  }
): Promise<string> {
  try {
    // Ensure debug directory exists
    await fs.mkdir(DEBUG_OUTPUT_DIR, { recursive: true })

    // Create filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFilename = `${documentId}-${timestamp}.json`
    const outputPath = path.join(DEBUG_OUTPUT_DIR, outputFilename)

    // Calculate stats
    const stats = {
      totalPages: documentAIResult.pages?.length || 0,
      totalText: documentAIResult.text?.length || 0,
      hasEntities: (documentAIResult.entities?.length || 0) > 0,
      entityCount: documentAIResult.entities?.length || 0,
      hasTables: documentAIResult.pages?.some(p => p.tables && p.tables.length > 0) || false,
      tableCount: documentAIResult.pages?.reduce((sum, p) => sum + (p.tables?.length || 0), 0) || 0,
      hasBlocks: documentAIResult.pages?.some(p => p.blocks && p.blocks.length > 0) || false,
      blockCount: documentAIResult.pages?.reduce((sum, p) => sum + (p.blocks?.length || 0), 0) || 0,
      hasParagraphs: documentAIResult.pages?.some(p => p.paragraphs && p.paragraphs.length > 0) || false,
      paragraphCount: documentAIResult.pages?.reduce((sum, p) => sum + (p.paragraphs?.length || 0), 0) || 0,
      hasFormFields: documentAIResult.pages?.some(p => p.formFields && p.formFields.length > 0) || false,
      formFieldCount: documentAIResult.pages?.reduce((sum, p) => sum + (p.formFields?.length || 0), 0) || 0,
      hasDocumentLayout: !!documentAIResult.documentLayout,
      documentLayoutBlockCount: documentAIResult.documentLayout?.blocks?.length || 0,
    }

    // Prepare output data with metadata and full Document AI response
    const debugData = {
      metadata: {
        documentId,
        capturedAt: new Date().toISOString(),
        filename: metadata?.filename,
        fileSize: metadata?.fileSize,
        pageCount: metadata?.pageCount,
        processor: metadata?.processor,
      },
      stats,
      documentAIResponse: documentAIResult,

      // Sample data for quick inspection (first page only)
      samples: {
        firstPageBlocks: documentAIResult.pages?.[0]?.blocks?.slice(0, 3) || [],
        firstPageParagraphs: documentAIResult.pages?.[0]?.paragraphs?.slice(0, 3) || [],
        firstPageLines: documentAIResult.pages?.[0]?.lines?.slice(0, 5) || [],
        firstPageTokens: documentAIResult.pages?.[0]?.tokens?.slice(0, 10) || [],
        entities: documentAIResult.entities?.slice(0, 10) || [],
        tables: documentAIResult.pages?.[0]?.tables?.[0] || null,
      }
    }

    // Write to file with pretty formatting
    await fs.writeFile(outputPath, JSON.stringify(debugData, null, 2), 'utf-8')

    // Log structured data
    logger.info('Document AI raw output saved for analysis', {
      documentId,
      outputPath,
      stats,
      component: 'debug-document-ai'
    })

    // Log formatted output for terminal display
    const formattedOutput = [
      '',
      '='.repeat(80),
      '📝 Document AI Response Saved for Analysis',
      '='.repeat(80),
      `File: ${outputPath}`,
      '',
      'Quick Stats:',
      `  - Pages: ${stats.totalPages}`,
      `  - Text Length: ${stats.totalText} characters`,
      `  - Entities: ${stats.entityCount}`,
      `  - Tables: ${stats.tableCount}`,
      `  - Blocks: ${stats.blockCount}`,
      `  - Paragraphs: ${stats.paragraphCount}`,
      `  - Form Fields: ${stats.formFieldCount}`,
      `  - Document Layout Blocks: ${stats.documentLayoutBlockCount}`,
      '='.repeat(80),
      ''
    ].join('\n')

    logger.info(formattedOutput)

    return outputPath
  } catch (error) {
    logger.error('Failed to save Document AI response', error as Error, {
      documentId,
      component: 'debug-document-ai'
    })
    // Don't throw - we don't want to fail document processing if debug saving fails
    return ''
  }
}
