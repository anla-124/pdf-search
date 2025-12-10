import { format } from 'date-fns'
import { logger } from '@/lib/logger'

/**
 * Formats a date string from the database to a user-friendly format
 * Handles timezone conversion from UTC to local time
 */
export function formatUploadDate(dateString: string): string {
  try {
    // Parse and format exactly as stored in Supabase without timezone conversion
    // Input: "2025-09-29 15:00:13.212493+00" -> Output: "29 Sep 2025 - 3:00 PM"
    const date = new Date(dateString)
    
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date')
    }
    
    // Extract UTC components to avoid timezone conversion
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    
    // Create a new date in local timezone with UTC components
    // This effectively shows the UTC time as if it were local time
    const displayDate = new Date(year, month, day, hours, minutes)
    
    return format(displayDate, 'dd MMM yyyy - h:mm a')
  } catch (error) {
    logger.error('[date-utils] Error formatting date', error instanceof Error ? error : new Error(String(error)), { dateString })
    return 'Invalid date'
  }
}
