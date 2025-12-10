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
      const errorText = await response.text()
      throw new Error(`Failed to retrieve document: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const blob = await response.blob()

    // Check if blob is valid
    if (!blob || blob.size === 0) {
      throw new Error(`Received empty blob for document (blob size: ${blob?.size || 0})`)
    }

    const url = window.URL.createObjectURL(blob)

    // Note: window.open() returns null with 'noopener' flag even on success
    // This is expected security behavior, so we don't check the return value
    window.open(url, '_blank', 'noopener,noreferrer')

    // Clean up after the new tab has a chance to load the blob URL
    setTimeout(() => window.URL.revokeObjectURL(url), 1000)
  } catch (error) {
    // Ensure error is properly formatted
    const errorObj = error instanceof Error ? error : new Error(String(error))

    clientLogger.error('Failed to open document', {
      error: errorObj,
      errorMessage: errorObj.message,
      errorType: errorObj.name,
      documentId: document.id,
      filename: document.filename,
      title: document.title
    })

    alert(`Failed to open document: ${errorObj.message}`)
  }
}

/**
 * Downloads a document to the user's device
 */
export async function downloadDocument(document: Document): Promise<void> {
  try {
    const response = await fetch(`/api/documents/${document.id}/download`)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to download document: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const blob = await response.blob()

    // Check if blob is valid
    if (!blob || blob.size === 0) {
      throw new Error(`Received empty blob for document (blob size: ${blob?.size || 0})`)
    }

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
    // Ensure error is properly formatted
    const errorObj = error instanceof Error ? error : new Error(String(error))

    clientLogger.error('Failed to download document', {
      error: errorObj,
      errorMessage: errorObj.message,
      errorType: errorObj.name,
      documentId: document.id,
      filename: document.filename,
      title: document.title
    })

    alert(`Failed to download document: ${errorObj.message}`)
  }
}
