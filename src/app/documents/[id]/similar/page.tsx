import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { DashboardLayout } from '@/components/dashboard/layout'
import { SimilaritySearchForm } from '@/components/similarity/similarity-search-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DatabaseDocument as AppDocument } from '@/types/external-apis'
import { ArrowLeft, Sparkles, Target, Scale, UserCircle, ClipboardList, Globe } from 'lucide-react'
import { formatUploadDate } from '@/lib/date-utils'
import { getAllApprovedMetadataOptions } from '@/lib/metadata-options-server'
import type { MetadataOption } from '@/lib/metadata-options-server'
import { SourceDocumentActions } from '@/components/similarity/source-document-actions'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'General Search | PDF Search',
}

interface PageProps {
  params: Promise<{ id: string }>
}

const resolveOptionLabel = (value: unknown, options: ReadonlyArray<MetadataOption>): string => {
  if (typeof value !== 'string' || value.length === 0) {
    return value ? String(value) : ''
  }
  return options.find(opt => opt.value === value)?.label ?? value
}

export default async function SimilarDocumentsPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch metadata options for label resolution
  const metadataOptions = await getAllApprovedMetadataOptions()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch the source document
  // RLS policies handle access control - allow any @anduintransact.com user
  const { data: document, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single<AppDocument>()

  if (error || !document) {
    redirect('/dashboard')
  }

  if (document.status !== 'completed') {
    redirect('/dashboard')
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div className="h-6 border-l border-gray-300" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-blue-500" />
                General Search
              </h1>
            </div>
          </div>
        </div>

        {/* Source Document Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Target className="h-5 w-5" />
              Source Document
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Image src="/logo/pdf.svg" alt="PDF" width={24} height={24} />
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">
                    {document.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span>{formatFileSize(document.file_size)}</span>
                    <span>{formatUploadDate(document.created_at)}</span>
                    {document.page_count && (
                      <span>{document.page_count === 1 ? '1 page' : `${document.page_count} pages`}</span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <Scale className="h-3 w-3 text-gray-400" />
                      {document.metadata?.law_firm ? (
                        <span className="text-gray-600">{resolveOptionLabel(document.metadata?.law_firm, metadataOptions.law_firm)}</span>
                      ) : (
                        <span className="text-orange-500">(blank)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <UserCircle className="h-3 w-3 text-gray-400" />
                      {document.metadata?.fund_manager ? (
                        <span className="text-gray-600">{resolveOptionLabel(document.metadata?.fund_manager, metadataOptions.fund_manager)}</span>
                      ) : (
                        <span className="text-orange-500">(blank)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="h-3 w-3 text-gray-400" />
                      {document.metadata?.fund_admin ? (
                        <span className="text-gray-600">{resolveOptionLabel(document.metadata?.fund_admin, metadataOptions.fund_admin)}</span>
                      ) : (
                        <span className="text-orange-500">(blank)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-gray-400" />
                      {document.metadata?.jurisdiction ? (
                        <span className="text-gray-600">{resolveOptionLabel(document.metadata?.jurisdiction, metadataOptions.jurisdiction)}</span>
                      ) : (
                        <span className="text-orange-500">(blank)</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <SourceDocumentActions document={document} />
            </div>
          </CardContent>
        </Card>

        {/* Search Form and Results */}
        <SimilaritySearchForm documentId={id} sourceDocument={document} />
      </div>
    </DashboardLayout>
  )
}
