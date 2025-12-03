import { chromium, FullConfig } from '@playwright/test'

/**
 * Global Setup for Playwright Tests
 *
 * This runs ONCE before all tests start.
 * Use it for:
 * - Verifying environment variables are set
 * - Checking database connectivity
 * - Seeding test data (if needed)
 */
async function globalSetup(config: FullConfig) {
  console.warn('🚀 Starting PDF Search Test Suite...\n')

  // Check required environment variables
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ]

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach(varName => console.error(`   - ${varName}`))
    console.error('\n💡 Make sure .env.local file exists with all required variables\n')
    throw new Error('Missing environment variables')
  }

  console.warn('✅ Environment variables verified')

  // Optional: Verify server is reachable
  const baseURL = config.projects?.[0]?.use?.baseURL || 'http://localhost:3000'

  try {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    console.warn(`🔍 Checking server at ${baseURL}...`)
    const response = await page.goto(`${baseURL}/api/health`, {
      timeout: 10000,
      waitUntil: 'commit',
    })

    if (response && response.ok()) {
      console.warn('✅ Server is running and healthy\n')
    } else {
      console.warn('⚠️  Server responded but health check failed\n')
    }

    await browser.close()
  } catch {
    console.warn('⚠️  Could not verify server health (this is OK if server starts during tests)\n')
  }

  console.warn('📋 Test Configuration:')
  console.warn(`   Base URL: ${baseURL}`)
  console.warn(`   Workers: ${config.workers}`)
  console.warn(`   Retries: ${config.projects?.[0]?.retries ?? 'undefined'}`)
  console.warn(`   Projects: ${config.projects?.map(p => p.name).join(', ') ?? 'none'}`)
  console.warn('\n🧪 Running tests...\n')
}

export default globalSetup
