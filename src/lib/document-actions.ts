/**
 * Shared utilities for document actions (view, download)
 */

import { clientLogger } from '@/lib/client-logger'
import type { DatabaseDocument as Document } from '@/types/external-apis'

/**
 * Opens a document in a new browser tab
 */
export async function viewDocument(document: Document): Promise<void> {
  try {
    const response = await fetch(`/api/documents/${document.id}/download`)
    if (!response.ok) {
      throw new Error('Failed to retrieve document')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener,noreferrer')

    // Clean up after the new tab has a chance to load the blob URL
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  } catch (error) {
    clientLogger.error('Failed to open document', {
      error,
      documentId: document.id,
      filename: document.filename
    })
    alert('Failed to open document. Please try again.')
  }
}

/**
 * Downloads a document to the user's device
 */
export async function downloadDocument(document: Document): Promise<void> {
  try {
    const response = await fetch(`/api/documents/${document.id}/download`)
    if (!response.ok) {
      throw new Error('Failed to download document')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = window.document.createElement('a')
    link.href = url
    link.download = document.filename || `${document.title}.pdf`
    link.style.display = 'none'
    window.document.body.appendChild(link)
    link.click()
    window.document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    clientLogger.error('Failed to download document', {
      error,
      documentId: document.id,
      filename: document.filename
    })
    alert('Failed to download document. Please try again.')
  }
}
