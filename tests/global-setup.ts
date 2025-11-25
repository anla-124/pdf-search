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
  console.log('🚀 Starting PDF Searcher Test Suite...\n')

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

  console.log('✅ Environment variables verified')

  // Optional: Verify server is reachable
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000'

  try {
    const browser = await chromium.launch()
    const page = await browser.newPage()

    console.log(`🔍 Checking server at ${baseURL}...`)
    const response = await page.goto(`${baseURL}/api/health`, {
      timeout: 10000,
      waitUntil: 'commit',
    })

    if (response && response.ok()) {
      console.log('✅ Server is running and healthy\n')
    } else {
      console.warn('⚠️  Server responded but health check failed\n')
    }

    await browser.close()
  } catch (error) {
    console.warn('⚠️  Could not verify server health (this is OK if server starts during tests)\n')
  }

  console.log('📋 Test Configuration:')
  console.log(`   Base URL: ${baseURL}`)
  console.log(`   Workers: ${config.workers}`)
  console.log(`   Retries: ${config.retries}`)
  console.log(`   Projects: ${config.projects.map(p => p.name).join(', ')}`)
  console.log('\n🧪 Running tests...\n')
}

export default globalSetup
