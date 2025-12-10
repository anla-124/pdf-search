/**
 * Check if Qdrant is in sync with Supabase
 */

/* eslint-disable no-console */
import { createClient } from '@supabase/supabase-js'
import { QdrantClient } from '@qdrant/js-client-rest'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const qdrantUrl = process.env.QDRANT_URL!
const qdrantKey = process.env.QDRANT_API_KEY!
const collectionName = process.env.QDRANT_COLLECTION_NAME || 'documents'

async function checkSync() {
  // Check Supabase
  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data: docs, error } = await supabase
    .from('documents')
    .select('id, title')

  if (error) {
    console.error('Supabase error:', error)
    return
  }

  console.log('\n=== SUPABASE ===')
  console.log(`Total documents: ${docs?.length || 0}`)

  // Check Qdrant
  const qdrant = new QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantKey
  })

  const collectionInfo = await qdrant.getCollection(collectionName)
  console.log('\n=== QDRANT ===')
  console.log(`Total vectors: ${collectionInfo.points_count}`)

  // Get unique document IDs from Qdrant
  const scrollResult = await qdrant.scroll(collectionName, {
    limit: 10000,
    with_payload: true,
    with_vector: false
  })

  const documentIds = new Set<string>()
  for (const point of scrollResult.points) {
    const docId = (point.payload as { document_id?: string })?.document_id
    if (docId) {
      documentIds.add(docId)
    }
  }

  console.log(`Unique documents in Qdrant: ${documentIds.size}`)

  // Find orphaned vectors (in Qdrant but not in Supabase)
  const supabaseDocIds = new Set(docs?.map(d => d.id) || [])
  const orphaned = Array.from(documentIds).filter(id => !supabaseDocIds.has(id))

  console.log('\n=== SYNC STATUS ===')
  if (orphaned.length > 0) {
    console.log(`⚠️  Found ${orphaned.length} orphaned document(s) in Qdrant:`)
    for (const id of orphaned.slice(0, 10)) {
      // Count vectors for this document
      const count = scrollResult.points.filter(
        p => (p.payload as { document_id?: string })?.document_id === id
      ).length
      console.log(`  - ${id} (${count} vectors)`)
    }
    if (orphaned.length > 10) {
      console.log(`  ... and ${orphaned.length - 10} more`)
    }
  } else {
    console.log('✅ All Qdrant documents exist in Supabase')
  }

  // Find missing (in Supabase but not in Qdrant)
  const missing = Array.from(supabaseDocIds).filter(id => !documentIds.has(id))
  if (missing.length > 0) {
    console.log(`\n⚠️  Found ${missing.length} document(s) in Supabase without Qdrant vectors:`)
    for (const id of missing.slice(0, 10)) {
      const doc = docs?.find(d => d.id === id)
      console.log(`  - ${id}: ${doc?.title}`)
    }
    if (missing.length > 10) {
      console.log(`  ... and ${missing.length - 10} more`)
    }
  }
}

checkSync().catch(console.error)
