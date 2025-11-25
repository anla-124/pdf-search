import { APIRequestContext, APIResponse, expect } from '@playwright/test'

/**
 * API Testing Helper Utilities
 *
 * Provides common functions for testing API endpoints
 */

/**
 * Validate that an API response is successful (2xx status)
 */
export async function expectSuccessResponse(response: APIResponse, expectedStatus = 200) {
  expect(response.ok()).toBeTruthy()
  expect(response.status()).toBe(expectedStatus)
}

/**
 * Validate that an API response is an error with expected status
 */
export async function expectErrorResponse(response: APIResponse, expectedStatus: number, expectedError?: string) {
  expect(response.ok()).toBeFalsy()
  expect(response.status()).toBe(expectedStatus)

  if (expectedError) {
    const body = await response.json()
    expect(body.error).toContain(expectedError)
  }
}

/**
 * Validate response contains expected JSON structure
 */
export async function expectJsonResponse(response: APIResponse, expectedKeys: string[]) {
  expect(response.headers()['content-type']).toContain('application/json')
  const body = await response.json()

  for (const key of expectedKeys) {
    expect(body).toHaveProperty(key)
  }

  return body
}

/**
 * Wait for async operation to complete (e.g., document processing)
 */
export async function waitForCondition(
  request: APIRequestContext,
  checkFn: () => Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const timeout = options.timeout || 30000 // 30 seconds default
  const interval = options.interval || 1000 // 1 second default
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await checkFn()) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, interval))
  }

  throw new Error(`Condition not met within ${timeout}ms`)
}

/**
 * Upload a test document
 */
export async function uploadTestDocument(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  filePath: string,
  metadata?: Record<string, unknown>
) {
  const formData = new FormData()

  // Read file and create blob
  const fs = await import('fs')
  const fileBuffer = fs.readFileSync(filePath)
  const blob = new Blob([fileBuffer], { type: 'application/pdf' })

  formData.append('file', blob, 'test-document.pdf')
  if (metadata) {
    formData.append('metadata', JSON.stringify(metadata))
  }

  const response = await request.post('/api/documents/upload', {
    headers: authHeaders,
    multipart: formData as never,
  })

  return response
}

/**
 * Delete a document (cleanup helper)
 */
export async function deleteDocument(
  request: APIRequestContext,
  authHeaders: Record<string, string>,
  documentId: string
) {
  const response = await request.delete(`/api/documents/${documentId}`, {
    headers: authHeaders,
  })

  return response
}

/**
 * Create a sample PDF file for testing (in-memory)
 */
export async function createTestPDF(text: string): Promise<Buffer> {
  // This is a minimal PDF - in real tests, you might use pdf-lib
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(${text}) Tj
ET
endstream
endobj
5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj
xref
0 6
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000000367 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
445
%%EOF`

  return Buffer.from(pdfContent)
}

/**
 * Generate a random string for unique test data
 */
export function randomString(length = 10): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a unique document title for testing
 */
export function generateTestDocumentTitle(): string {
  return `test-document-${randomString(8)}-${Date.now()}`
}
