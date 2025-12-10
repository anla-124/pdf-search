/**
 * Clean up orphaned vectors in Qdrant
 * Removes vectors for documents that don't exist in Supabase
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { QdrantClient } from '@qdrant/js-client-rest'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const qdrantUrl = process.env.QDRANT_URL!
const qdrantKey = process.env.QDRANT_API_KEY!
const collectionName = process.env.QDRANT_COLLECTION_NAME || 'documents'

async function cleanOrphanedVectors() {
  console.log('🔍 Checking for orphaned vectors...\n')

  // Get all document IDs from Supabase
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id')

  if (error) {
    console.error('❌ Supabase error:', error)
    return
  }

  const supabaseDocIds = new Set(docs?.map(d => d.id) || [])
  console.log(`✅ Found ${supabaseDocIds.size} documents in Supabase`)

  // Get all vectors from Qdrant
  const qdrant = new QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantKey
  })

  const scrollResult = await qdrant.scroll(collectionName, {
    limit: 10000,
    with_payload: true,
    with_vector: false
  })

  console.log(`✅ Found ${scrollResult.points.length} vectors in Qdrant\n`)

  // Find orphaned document IDs
  const documentVectors = new Map<string, string[]>()

  for (const point of scrollResult.points) {
    const docId = (point.payload as { document_id?: string })?.document_id
    if (docId) {
      if (!documentVectors.has(docId)) {
        documentVectors.set(docId, [])
      }
      documentVectors.get(docId)!.push(String(point.id))
    }
  }

  const orphanedDocs = Array.from(documentVectors.keys()).filter(
    id => !supabaseDocIds.has(id)
  )

  if (orphanedDocs.length === 0) {
    console.log('✅ No orphaned vectors found!')
    return
  }

  console.log(`⚠️  Found ${orphanedDocs.length} orphaned document(s):`)
  let totalVectors = 0
  for (const docId of orphanedDocs) {
    const vectors = documentVectors.get(docId)!
    totalVectors += vectors.length
    console.log(`   - ${docId}: ${vectors.length} vectors`)
  }

  console.log(`\n🗑️  Total vectors to delete: ${totalVectors}`)
  console.log('⏳ Deleting orphaned vectors...\n')

  // Delete vectors for each orphaned document
  let deleted = 0
  for (const docId of orphanedDocs) {
    const vectorIds = documentVectors.get(docId)!

    try {
      // Convert string IDs to numbers if needed
      const numericIds = vectorIds.map(id => {
        const num = Number(id)
        return isNaN(num) ? id : num
      })

      await qdrant.delete(collectionName, {
        wait: true,
        points: numericIds
      })

      deleted += vectorIds.length
      console.log(`   ✅ Deleted ${vectorIds.length} vectors for ${docId}`)
    } catch (error) {
      console.error(`   ❌ Failed to delete vectors for ${docId}:`, error)
    }
  }

  console.log(`\n✅ Cleanup complete! Deleted ${deleted} orphaned vectors.`)
}

cleanOrphanedVectors().catch(console.error)
