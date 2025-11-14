'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Eye, Download } from 'lucide-react'
import { viewDocument, downloadDocument } from '@/lib/document-actions'
import type { DatabaseDocument as AppDocument } from '@/types/external-apis'

interface SourceDocumentActionsProps {
  document: AppDocument
  accent?: 'blue' | 'emerald'
}

const ACCENT_STYLES = {
  blue: {
    button: 'focus-visible:ring-blue-400',
    icon: 'text-blue-500'
  },
  emerald: {
    button: 'focus-visible:ring-emerald-400',
    icon: 'text-emerald-500'
  }
} as const

export function SourceDocumentActions({ document, accent = 'blue' }: SourceDocumentActionsProps) {
  const styles = ACCENT_STYLES[accent]

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => viewDocument(document)}
        className={cn('flex items-center', styles.button)}
      >
        <Eye className={cn('h-4 w-4 mr-1', styles.icon)} />
        View
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => downloadDocument(document)}
        className={cn('flex items-center', styles.button)}
      >
        <Download className={cn('h-4 w-4 mr-1', styles.icon)} />
        Download
      </Button>
    </div>
  )
}
