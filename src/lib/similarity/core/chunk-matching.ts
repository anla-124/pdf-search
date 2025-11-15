/**
 * Bidirectional Chunk Matching with Non-Max Suppression (NMS) and Tie-Breaking
 * CRITICAL: Implements proper NMS to ensure clean 1:1 chunk alignment
 *
 * Enhanced with Jaccard similarity filtering to reduce paraphrase false positives
 */

import { logger } from '@/lib/logger'
import { ChunkMatch, Chunk } from '../types'
import { cosineSimilarity } from '../utils/vector-operations'
import { jaccardSimilarity } from '../utils/jaccard-similarity'
import { hasSufficientEvidence } from './adaptive-scoring'

interface MatchingOptions {
  primaryThreshold?: number    // Cosine similarity threshold (default: 0.90)
  jaccardThreshold?: number    // Jaccard similarity threshold (default: 0, disabled)
}

/**
 * Find bidirectional matches between two documents with NMS
 * Returns null if insufficient evidence (dynamic minimum threshold)
 *
 * @param chunksA - Source document chunks (pre-normalized embeddings)
 * @param chunksB - Target document chunks (pre-normalized embeddings)
 * @param threshold - Similarity threshold (default: 0.90)
 * @returns Array of matched pairs, or null if insufficient evidence
 */
export async function findBidirectionalMatches(
  chunksA: Chunk[],
  chunksB: Chunk[],
  thresholdOrOptions: number | MatchingOptions = 0.90
): Promise<ChunkMatch[] | null> {

  const options: MatchingOptions = typeof thresholdOrOptions === 'number'
    ? { primaryThreshold: thresholdOrOptions, jaccardThreshold: 0 }
    : {
        primaryThreshold: thresholdOrOptions.primaryThreshold ?? 0.90,
        jaccardThreshold: thresholdOrOptions.jaccardThreshold ?? 0
      }

  // Direction A→B: For each chunk in A, find best match in B
  const matchesAtoB = findBestMatches(chunksA, chunksB, options)

  // Direction B→A: For each chunk in B, find best match in A
  const matchesBtoA = findBestMatches(chunksB, chunksA, options)

  // Merge bidirectional matches (deduplicate pairs)
  const allMatches = mergeBidirectionalMatches(matchesAtoB, matchesBtoA)

  // Dynamic minimum evidence filter (CRITICAL)
  // Prevents false positives from coincidental matches
  // Calculate total characters for both documents
  const totalCharactersA = chunksA.reduce((sum, chunk) => sum + chunk.characterCount, 0)
  const totalCharactersB = chunksB.reduce((sum, chunk) => sum + chunk.characterCount, 0)

  // Calculate matched characters (use smaller of A or B for conservative check)
  const matchedCharactersA = allMatches.reduce((sum, match) => sum + match.chunkA.characterCount, 0)
  const matchedCharactersB = allMatches.reduce((sum, match) => sum + match.chunkB.characterCount, 0)
  const matchedCharacters = Math.min(matchedCharactersA, matchedCharactersB)

  const sufficientEvidence = hasSufficientEvidence(
    matchedCharacters,
    totalCharactersA,
    totalCharactersB
  )

  if (!sufficientEvidence) {
    const minRequired = Math.max(1600, Math.ceil(0.05 * Math.min(totalCharactersA, totalCharactersB)))
    logger.warn('Insufficient evidence for similarity match', {
      matchCount: allMatches.length,
      matchedCharacters,
      totalCharactersA,
      totalCharactersB,
      requiredCharacters: minRequired
    })
    return null
  }

  return allMatches
}

/**
 * Find best matches from source to target with NMS and tie-breaking
 * Each source chunk matches AT MOST one target chunk (NMS)
 *
 * Filtering stages:
 * 1. Cosine similarity threshold (semantic relevance)
 * 2. Jaccard similarity threshold (lexical overlap, optional)
 *
 * Tie-breaking order:
 * 1. Higher cosine similarity
 * 2. Closer page number (spatial proximity)
 */
function findBestMatches(
  sourceChunks: Chunk[],
  targetChunks: Chunk[],
  options: MatchingOptions
): Map<string, ChunkMatch> {

  const cosineThreshold = options.primaryThreshold ?? 0.90
  const jaccardThreshold = options.jaccardThreshold ?? 0
  const jaccardEnabled = jaccardThreshold > 0

  const matches = new Map<string, ChunkMatch>()

  // Track filtering stats for logging
  let totalCosinePassed = 0
  let totalJaccardFiltered = 0

  // Early exit optimization: If first 40 chunks yield 0 matches, bail
  let earlyMatchCount = 0
  const earlyExitThreshold = Math.min(40, sourceChunks.length)

  for (let i = 0; i < sourceChunks.length; i++) {
    const chunkA = sourceChunks[i]!

    // Find all candidates above cosine threshold
    const candidates: Array<{ chunkB: Chunk; score: number; jaccardScore: number }> = []

    for (const chunkB of targetChunks) {
      // Stage 1: Cosine similarity filter (semantic relevance)
      const score = cosineSimilarity(chunkA.embedding, chunkB.embedding)
      if (score < cosineThreshold) {
        continue
      }

      totalCosinePassed++

      // Stage 2: Jaccard similarity filter (lexical overlap)
      // Only applies if threshold > 0 and both chunks have text
      if (jaccardEnabled && chunkA.text && chunkB.text) {
        const jaccardScore = jaccardSimilarity(chunkA.text, chunkB.text)

        if (jaccardScore < jaccardThreshold) {
          totalJaccardFiltered++
          continue  // Filter out paraphrased chunk
        }

        candidates.push({ chunkB, score, jaccardScore })
      } else {
        candidates.push({ chunkB, score, jaccardScore: 0 })
      }
    }

    if (candidates.length === 0) {
      // Early exit check: If first 40 chunks have no matches, skip rest
      if (i < earlyExitThreshold) {
        if (earlyMatchCount === 0 && i === earlyExitThreshold - 1) {
          logger.warn('Early exit: no matches found in initial chunk sample', {
            inspectedChunks: earlyExitThreshold
          })
          break
        }
      }
      continue
    }

    earlyMatchCount++

    // Tie-breaking: 1. Highest score, 2. Closer page number
    const bestMatch = candidates.reduce((best, curr) => {
      const scoreDiff = Math.abs(curr.score - best.score)

      if (scoreDiff < 0.001) {
        // Scores essentially equal - break tie by page proximity
        const distBest = Math.abs(chunkA.pageNumber - best.chunkB.pageNumber)
        const distCurr = Math.abs(chunkA.pageNumber - curr.chunkB.pageNumber)
        return distCurr < distBest ? curr : best
      }

      // Clear score difference - choose higher score
      return curr.score > best.score ? curr : best
    })

    // NMS: Each source chunk matches at most once
    matches.set(chunkA.id, {
      chunkA: {
        id: chunkA.id,
        index: chunkA.index,
        pageNumber: chunkA.pageNumber,
        characterCount: chunkA.characterCount
      },
      chunkB: {
        id: bestMatch.chunkB.id,
        index: bestMatch.chunkB.index,
        pageNumber: bestMatch.chunkB.pageNumber,
        characterCount: bestMatch.chunkB.characterCount
      },
      score: bestMatch.score,
      jaccardScore: bestMatch.jaccardScore
    })
  }

  // Log filtering stats if Jaccard was enabled
  if (jaccardEnabled && totalJaccardFiltered > 0) {
    logger.info('Jaccard similarity filtering applied', {
      cosineThreshold,
      jaccardThreshold,
      cosinePassed: totalCosinePassed,
      jaccardFiltered: totalJaccardFiltered,
      finalMatches: matches.size,
      filterRate: `${((totalJaccardFiltered / totalCosinePassed) * 100).toFixed(1)}%`
    })
  }

  return matches
}

/**
 * Merge bidirectional matches, deduplicating pairs
 *
 * Algorithm:
 * 1. Collect all candidate pairs from both directions
 * 2. Sort by score (highest first)
 * 3. Remove exact duplicate pairs (same source → same target)
 *
 * Note: This allows multiple-to-one relationships:
 * - Multiple source chunks can match the same target chunk
 * - Multiple target chunks can match the same source chunk
 * Character-based scoring handles deduplication via Sets
 */
function mergeBidirectionalMatches(
  matchesAtoB: Map<string, ChunkMatch>,
  matchesBtoA: Map<string, ChunkMatch>
): ChunkMatch[] {

  // Collect all candidate pairs
  const allPairs: ChunkMatch[] = []

  // Add matches from A→B
  for (const match of matchesAtoB.values()) {
    allPairs.push(match)
  }

  // Add matches from B→A (swapped to ensure chunkA is from doc A)
  for (const match of matchesBtoA.values()) {
    // In B→A matches, chunkA is from B and chunkB is from A
    const swapped: ChunkMatch = {
      chunkA: match.chunkB,  // Swap: make chunkA from original doc A
      chunkB: match.chunkA,  // Swap: make chunkB from original doc B
      score: match.score
    }
    allPairs.push(swapped)
  }

  return greedySelectPairs(allPairs)
}

/**
 * Remove exact duplicate pairs from candidate list
 *
 * Only removes pairs where the same source chunk maps to the same target chunk.
 * Does NOT enforce 1-to-1 constraint - allows multiple-to-one relationships.
 *
 * @param pairs - Candidate chunk pairs (may contain duplicate pairs)
 * @returns Filtered pairs with exact duplicates removed
 */
function greedySelectPairs(pairs: ChunkMatch[]): ChunkMatch[] {
  const sorted = [...pairs].sort((a, b) => b.score - a.score)
  const seenPairs = new Set<string>()
  const result: ChunkMatch[] = []

  for (const pair of sorted) {
    const key = `${pair.chunkA.id}->${pair.chunkB.id}`
    if (seenPairs.has(key)) {
      continue
    }
    result.push(pair)
    seenPairs.add(key)
  }

  return result
}

/**
 * Batch version for parallel processing
 * Process multiple source documents against multiple targets
 */
export async function batchFindMatches(
  sourceDocs: Array<{ id: string; chunks: Chunk[] }>,
  targetDocs: Array<{ id: string; chunks: Chunk[] }>,
  thresholdOrOptions: number | MatchingOptions = 0.90
): Promise<Map<string, Map<string, ChunkMatch[]>>> {

  const results = new Map<string, Map<string, ChunkMatch[]>>()

  // Process in parallel (each source vs each target)
  const promises: Promise<void>[] = []

  for (const sourceDoc of sourceDocs) {
    for (const targetDoc of targetDocs) {
      promises.push(
        (async () => {
          const matches = await findBidirectionalMatches(
            sourceDoc.chunks,
            targetDoc.chunks,
            thresholdOrOptions
          )

          if (matches) {
            if (!results.has(sourceDoc.id)) {
              results.set(sourceDoc.id, new Map())
            }
            results.get(sourceDoc.id)!.set(targetDoc.id, matches)
          }
        })()
      )
    }
  }

  await Promise.all(promises)
  return results
}
