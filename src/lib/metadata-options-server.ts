import { createClient } from '@/lib/supabase/server'

export type MetadataCategory = 'law_firm' | 'fund_manager' | 'fund_admin' | 'jurisdiction'
export type MetadataOption = { value: string; label: string }

/**
 * Fetch approved metadata options for a specific category (server-side only)
 */
export async function getApprovedMetadataOptions(category: MetadataCategory): Promise<MetadataOption[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('metadata_options')
    .select('value, label')
    .eq('category', category)
    .eq('status', 'approved')
    .order('label')

  if (error) {
    console.error(`Error fetching ${category} metadata options:`, error)
    return []
  }

  return data || []
}

/**
 * Fetch all approved metadata options grouped by category (server-side only)
 * More efficient than calling getApprovedMetadataOptions() multiple times
 */
export async function getAllApprovedMetadataOptions(): Promise<Record<MetadataCategory, MetadataOption[]>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('metadata_options')
    .select('category, value, label')
    .eq('status', 'approved')
    .order('label')

  if (error) {
    console.error('Error fetching all metadata options:', error)
    return {
      law_firm: [],
      fund_manager: [],
      fund_admin: [],
      jurisdiction: []
    }
  }

  // Group by category
  const grouped: Record<MetadataCategory, MetadataOption[]> = {
    law_firm: [],
    fund_manager: [],
    fund_admin: [],
    jurisdiction: []
  }

  for (const option of data || []) {
    const category = option.category as MetadataCategory
    if (category in grouped) {
      grouped[category].push({ value: option.value, label: option.label })
    }
  }

  return grouped
}
