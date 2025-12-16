'use client'

import { useEffect, useState, useCallback } from 'react'

export interface MetadataOption {
  id?: string
  value: string
  label: string
  status?: string
  created_at?: string
}

export interface UseMetadataOptionsResult {
  options: MetadataOption[]
  loading: boolean
  error: Error | null
  requestNewOption: (value: string, label?: string) => Promise<boolean>
  refresh: () => Promise<void>
}

type MetadataCategory = 'law_firm' | 'fund_manager' | 'fund_admin' | 'jurisdiction'

/**
 * Client-side hook to fetch and manage metadata options for dropdowns
 *
 * This hook fetches approved metadata options from the API and provides
 * a function to create new options (requires admin authentication).
 *
 * @param category - The metadata category to fetch options for
 * @returns {UseMetadataOptionsResult} Object containing options, loading state, error, and request function
 *
 * @example
 * const { options, loading, requestNewOption } = useMetadataOptions('law_firm')
 *
 * // Create a new option (admin only, creates as approved immediately)
 * const success = await requestNewOption('New Law Firm', 'New Law Firm LLP')
 */
export function useMetadataOptions(category: MetadataCategory): UseMetadataOptionsResult {
  const [options, setOptions] = useState<MetadataOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(
        `/api/metadata/options?category=${category}&status=approved`,
        {
          cache: 'no-store', // Disable Next.js fetch caching
          headers: {
            'Cache-Control': 'no-cache', // Disable browser caching
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch metadata options: ${response.statusText}`)
      }

      const data = await response.json()
      setOptions(data.options || [])
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metadata options'))
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const requestNewOption = useCallback(
    async (value: string, label?: string): Promise<boolean> => {
      try {
        const response = await fetch('/api/metadata/options', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category,
            value,
            label: label || value,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create new option')
        }

        // Success - the new option is created and immediately approved
        return true
      } catch (err) {
        console.error('Error requesting new metadata option:', err)
        setError(err instanceof Error ? err : new Error('Failed to request new option'))
        return false
      }
    },
    [category]
  )

  const refresh = useCallback(async () => {
    await fetchOptions()
  }, [fetchOptions])

  return {
    options,
    loading,
    error,
    requestNewOption,
    refresh,
  }
}
