/**
 * Verify that threshold changes reduce false positives
 * Tests the full similarity search pipeline with different thresholds
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local explicitly
config({ path: resolve(process.cwd(), '.env.local') })

import { executeSimilaritySearch } from '@/lib/similarity/orchestrator'

async function verifyThresholdChanges(sourceDocId: string, expectedNotSimilarDocId: string) {
  console.log('='.repeat(80))
  console.log('THRESHOLD VERIFICATION TEST')
  console.log('='.repeat(80))
  console.log()
  console.log(`Source Document: ${sourceDocId}`)
  console.log(`Expected NOT Similar Document: ${expectedNotSimilarDocId}`)
  console.log()
  console.log(`Current Threshold:`)
  console.log(`  STAGE2_THRESHOLD=${process.env['STAGE2_THRESHOLD'] || '0.90'}`)
  console.log()

  try {
    console.log('Running full similarity search pipeline...')
    console.log()

    const result = await executeSimilaritySearch(sourceDocId, {
      stage0_topK: 600,
      stage1_topK: 250,
      stage2_parallelWorkers: 1  // Use single worker for predictable timing
    })

    console.log('='.repeat(80))
    console.log('SEARCH RESULTS')
    console.log('='.repeat(80))
    console.log()
    console.log(`Total Results: ${result.results.length}`)
    console.log()
    console.log('Timing:')
    console.log(`  Stage 0: ${result.timing.stage0_ms}ms`)
    console.log(`  Stage 1: ${result.timing.stage1_ms}ms`)
    console.log(`  Stage 2: ${result.timing.stage2_ms}ms`)
    console.log(`  Total:   ${result.timing.total_ms}ms`)
    console.log()

    // Check if the "not similar" document appears in results
    const notSimilarDocInResults = result.results.find(r => r.document.id === expectedNotSimilarDocId)

    if (notSimilarDocInResults) {
      console.log('⚠️  WARNING: Expected NOT similar document found in results!')
      console.log()
      console.log(`Document: ${notSimilarDocInResults.document.title || notSimilarDocInResults.document.filename}`)
      console.log(`  Source Score: ${(notSimilarDocInResults.scores.sourceScore * 100).toFixed(1)}%`)
      console.log(`  Target Score: ${(notSimilarDocInResults.scores.targetScore * 100).toFixed(1)}%`)
      console.log(`  Matched Chunks: ${notSimilarDocInResults.matchedChunks}`)
      console.log(`  Matched Source Chars: ${notSimilarDocInResults.scores.matchedSourceCharacters}`)
      console.log(`  Matched Target Chars: ${notSimilarDocInResults.scores.matchedTargetCharacters}`)
      console.log()
      console.log('RECOMMENDATION: Increase thresholds further (try 0.91-0.92)')
    } else {
      console.log('✅ SUCCESS: Expected NOT similar document correctly filtered out!')
      console.log()
      console.log('The new thresholds are working correctly.')
    }

    console.log()
    console.log('='.repeat(80))
    console.log('TOP 5 RESULTS')
    console.log('='.repeat(80))
    console.log()

    for (let i = 0; i < Math.min(5, result.results.length); i++) {
      const doc = result.results[i]
      if (!doc) continue

      console.log(`${i + 1}. ${doc.document.title || doc.document.filename}`)
      console.log(`   ID: ${doc.document.id}`)
      console.log(`   Source Score: ${(doc.scores.sourceScore * 100).toFixed(1)}%`)
      console.log(`   Target Score: ${(doc.scores.targetScore * 100).toFixed(1)}%`)
      console.log(`   Matched Chunks: ${doc.matchedChunks}`)
      console.log(`   Sections: ${doc.sections.length}`)
      console.log()
    }

    console.log('='.repeat(80))
    console.log('VERIFICATION COMPLETE')
    console.log('='.repeat(80))

  } catch (error) {
    console.error('Error running similarity search:', error)
    throw error
  }
}

// Main execution
const sourceDoc = process.argv[2] || '68fb610f-2cb7-4f1a-9082-fbefc6122356'
const notSimilarDoc = process.argv[3] || '2f7382c3-5afb-4720-83cb-0c827ed0363d'

verifyThresholdChanges(sourceDoc, notSimilarDoc)
  .then(() => {
    console.log()
    process.exit(0)
  })
  .catch((error) => {
    console.error('Verification failed:', error)
    process.exit(1)
  })
