import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { updateQuoteAction } from '@/actions/quotes'
import { QuoteForm } from '@/components/admin/quote-form'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireAdmin } from '@/lib/auth/session'
import { getQuoteForEdit, listProviders } from '@/lib/queries/admin'

export const metadata: Metadata = {
  title: '見積もりの編集',
}

export default async function EditQuotePage({
  params,
}: {
  params: Promise<{ id: string; quoteId: string }>
}) {
  const [{ supabase }, { id, quoteId }] = await Promise.all([requireAdmin(), params])

  const [result, providers] = await Promise.all([
    getQuoteForEdit(supabase, quoteId),
    listProviders(supabase),
  ])

  if (!result || result.quote.request_id !== id) notFound()

  return (
    <PageContainer>
      <PageTitle
        eyebrow={
          <Link href={`/admin/requests/${id}`} className="underline underline-offset-2">
            案件詳細へ戻る
          </Link>
        }
        title="見積もりの編集"
      />

      <QuoteForm
        action={updateQuoteAction}
        requestId={id}
        providers={providers}
        quote={result.quote}
        items={result.items}
        submitLabel="変更を保存する"
        cancelHref={`/admin/requests/${id}`}
      />
    </PageContainer>
  )
}
