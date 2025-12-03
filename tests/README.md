# Test Suite Documentation

## Overview

This test suite provides high-confidence validation of the PDF Search application through real end-to-end workflows with actual document processing, OCR, embeddings, and similarity search.

## Test Categories

### ⚡ Unit Tests (`tests/unit/`) - NEW!
**Purpose:** Fast, isolated business logic validation with mocked services
**Runtime:** ~15 seconds
**When to run:** On every commit, during local development, in CI/CD

**What they test:**
- Document processing logic with mocked Document AI
- Embedding generation with mocked Vertex AI
- Vector storage and search with mocked Qdrant
- Business logic without external dependencies

**Benefits:**
- ✅ Fast (<20s total)
- ✅ Free (no API costs)
- ✅ Deterministic (no flakiness from external services)
- ✅ Suitable for CI/CD on every commit

**Command:**
```bash
npm run test:unit
```

### 🔥 Smoke Tests (`tests/smoke/`)
**Purpose:** Fast, critical path validation
**Runtime:** ~30-60 seconds
**When to run:** Before every deployment, after major changes

**What they test:**
- Application server health
- Database connectivity
- Authentication endpoints
- Core user workflow (upload → process → search → download → delete)

**Command:**
```bash
npm run test:smoke
```

### 🔬 Integration Tests (`tests/integration/`)
**Purpose:** Comprehensive end-to-end validation with real services
**Runtime:** ~3-5 minutes (includes real document processing)
**When to run:** Pre-deployment validation, staging environment

**What they test:**
- Complete document lifecycle workflows
- Multiple document handling
- Error recovery and retry logic
- Search relevance with real embeddings

**Command:**
```bash
npm run test:integration
```

## Test Infrastructure

### Authentication

Tests use **real Supabase authentication** with a dedicated test user account.

#### Test User Credentials

**Owner:** Development Team
**Credentials stored in:** `.env.local` (never commit to git)

```bash
TEST_USER_EMAIL=test@anduintransact.com
TEST_USER_PASSWORD=test123456
```

**⚠️ IMPORTANT:**
- These credentials must be maintained by the team
- If credentials expire or change, all tests will fail
- Rotate credentials periodically per security policy
- Never expose these in client-side code or public repos

#### Service Role Key

The application requires the **service role key** for operational infrastructure:

```typescript
// Used by connection pool for background operations
const client = createServerClient(
  supabaseUrl,
  serviceRoleKey  // Creates service-level database connections
)
```

**⚠️ SECURITY:**
- Service role key bypasses Row Level Security (RLS)
- **ONLY** for server-side connection pool and background operations
- **NOT** used for API endpoint authentication (tests use real user JWT tokens)
- **NEVER** expose `SUPABASE_SERVICE_ROLE_KEY` client-side
- Keep strictly server-side in environment variables

### Test Strategy

#### Unit Tests with Mocks (CI/CD) ⚡
✅ **What:** Mocked Document AI, Vertex AI, and Qdrant services
✅ **Pros:** Fast (~15s), free (no API costs), deterministic, reliable
✅ **Use for:**
- Every commit in CI/CD
- Local development
- Testing business logic
- Edge cases and error conditions

**Mock Infrastructure:**
- `tests/mocks/document-ai.mock.ts` - OCR extraction simulation
- `tests/mocks/vertex-ai.mock.ts` - Embedding generation
- `tests/mocks/qdrant.mock.ts` - In-memory vector database

#### Live Service Tests (Pre-Deployment)
✅ **What:** Tests hit real Supabase, Document AI, Vertex AI, Qdrant
✅ **Pros:** High confidence - validates actual integration
❌ **Cons:** Slow (~3 min), expensive (API costs), potential flakiness

**Use for:**
- Pre-deployment validation
- Staging environment verification
- Production readiness checks

## Environment Setup

Required environment variables in `.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Test User
TEST_USER_EMAIL=test@anduintransact.com
TEST_USER_PASSWORD=test123456

# CRON
CRON_SECRET=your-cron-secret
```

## Security Considerations

### Secrets Management
- ✅ All secrets in `.env.local` (gitignored)
- ✅ Service role key never exposed client-side
- ✅ Test user has limited permissions
- ❌ **Never** commit credentials to git
- ❌ **Never** use production credentials for tests

## CI/CD Recommendations

### GitHub Actions / CI Pipeline

**On Every Commit:**
```bash
npm run test:ci  # Runs unit + smoke tests (~45s total)
```

**Benefits:**
- Fast feedback (<1 minute)
- No API costs
- Reliable (no external service dependencies for unit tests)
- Catches regressions early

**Pre-Deployment / Staging:**
```bash
npm run test:integration  # Runs full integration tests (~3-5 min)
```

**Benefits:**
- Validates real API integrations
- Tests actual document processing pipeline
- High confidence before production deployment

### Test Execution Strategy

```
┌─────────────────────────────────────────────────┐
│ LOCAL DEVELOPMENT                                │
│ • npm run test:unit (during development)        │
│ • npm run test:smoke (before committing)        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ CI - ON EVERY COMMIT                             │
│ • npm run test:ci (unit + smoke)                │
│ • Fast feedback (~45s)                           │
│ • No external API costs                          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ PRE-DEPLOYMENT / STAGING                         │
│ • npm run test:integration                       │
│ • Full end-to-end validation (~3-5 min)         │
│ • Real external services                         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ PRODUCTION DEPLOYMENT                            │
└─────────────────────────────────────────────────┘
```

For complete documentation, see the full README sections on test helpers, debugging, and maintenance.
