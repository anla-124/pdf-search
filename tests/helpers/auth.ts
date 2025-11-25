import { APIRequestContext } from '@playwright/test'

/**
 * Authentication Helper for Tests
 *
 * Provides utilities for authenticating test requests
 */

export interface TestUser {
  email: string
  password: string
  accessToken?: string
  refreshToken?: string
}

/**
 * Create a test user session (for API testing)
 * Note: In real tests, you'll need actual test credentials or use Supabase test helpers
 */
export async function createTestUserSession(request: APIRequestContext, user: TestUser) {
  // For now, we'll use email/password auth
  // In production, you might use a test user from your database
  const response = await request.post('/api/auth/signin', {
    data: {
      email: user.email,
      password: user.password,
    },
  })

  if (!response.ok()) {
    throw new Error(`Failed to create test user session: ${response.status()} ${await response.text()}`)
  }

  const data = await response.json()
  user.accessToken = data.access_token
  user.refreshToken = data.refresh_token

  return user
}

/**
 * Get authorization headers for authenticated requests
 */
export function getAuthHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Get CRON_SECRET authorization header for cron endpoints
 */
export function getCronAuthHeader(): Record<string, string> {
  const cronSecret = process.env.CRON_SECRET || 'test-secret-for-local-dev'
  return {
    'Authorization': `Bearer ${cronSecret}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Test user credentials (you should set these in .env.test.local)
 */
export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'test-password-123',
  },
  user1: {
    email: process.env.TEST_USER1_EMAIL || 'test-user1@example.com',
    password: process.env.TEST_USER1_PASSWORD || 'test-password-123',
  },
  user2: {
    email: process.env.TEST_USER2_EMAIL || 'test-user2@example.com',
    password: process.env.TEST_USER2_PASSWORD || 'test-password-123',
  },
}
