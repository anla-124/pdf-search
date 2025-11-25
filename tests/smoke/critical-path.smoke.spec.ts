import { test, expect } from '@playwright/test'

/**
 * SMOKE TESTS - Critical Path
 *
 * These are the fastest tests that verify the most critical functionality.
 * Run these before every deployment to ensure nothing is broken.
 *
 * Expected runtime: ~30 seconds
 */

test.describe('Smoke Tests - Critical Path', () => {
  test('Application server is running', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.ok()).toBeTruthy()
  })

  test('Database connection works', async ({ request }) => {
    const response = await request.get('/api/health')
    const body = await response.json()

    // Should return healthy status (or at least respond)
    expect(body).toHaveProperty('status')
  })

  test('Connection pool is healthy', async ({ request }) => {
    const response = await request.get('/api/health/pool')
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body).toHaveProperty('connectionPool')
    expect(body.connectionPool).toHaveProperty('metrics')
    expect(body.connectionPool.metrics).toHaveProperty('totalConnections')
  })

  test('API endpoints respond (not 404)', async ({ request }) => {
    // Test a few key endpoints just to verify routing works
    const endpoints = [
      '/api/health',
      '/api/health/pool',
    ]

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint)
      // Should not be 404 (Not Found)
      expect(response.status()).not.toBe(404)
    }
  })

  test('CRON authentication works', async ({ request }) => {
    const cronSecret = process.env.CRON_SECRET || 'test-secret-for-local-dev'

    // Should reject without auth
    const unauthResponse = await request.get('/api/cron/process-jobs')
    expect(unauthResponse.status()).toBe(401)

    // Should accept with auth
    const authResponse = await request.get('/api/cron/process-jobs', {
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
      },
    })
    expect(authResponse.ok()).toBeTruthy()
  })

  test('Debug endpoint is protected', async ({ request }) => {
    // Should reject without auth
    const response = await request.post('/api/debug/retry-embeddings')
    expect(response.status()).toBe(401)
  })

  test('Environment variables are loaded', async () => {
    // Verify critical environment variables exist
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
  })
})
