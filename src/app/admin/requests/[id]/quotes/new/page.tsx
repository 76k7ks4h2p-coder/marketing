import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createQuoteAction } from '@/actions/quotes'
import { QuoteForm } from '@/components/admin/quote-form'
import { ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/feedback'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireAdmin } from '@/lib/auth/session'
import { listActiveProviders } from '@/lib/queries/admin'
import { unwrapMaybe } from '@/lib/queries/utils'

export const metadata: Metadata = {
  title: '見積もりの登録',
}

export default async function NewQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ supabase }, { id }] = await Promise.all([requireAdmin(), params])

  const request = unwrapMaybe(
    await supabase
      .from('service_requests')
      .select('id, request_number, title')
      .eq('id', id)
      .maybeSingle(),
    'NewQuotePage.request',
  )

  if (!request) notFound()

  const providers = await listActiveProviders(supabase)

  return (
    <PageContainer>
      <PageTitle
        eyebrow={
          <Link href={`/admin/requests/${id}`} className="underline underline-offset-2">
            案件詳細へ戻る
          </Link>
        }
        title="見積もりの登録"
        description={`${request.request_number} / ${request.title}`}
      />

      {providers.length === 0 ? (
        <>
          <Alert variant="warning" title="有効な業者が登録されていません" className="mb-4">
            見積もりを登録するには、先に業者を登録してください。
          </Alert>
          <ButtonLink href="/admin/providers/new">業者を登録する</ButtonLink>
        </>
      ) : (
        <QuoteForm
          action={createQuoteAction}
          requestId={id}
          providers={providers}
          submitLabel="この内容で登録する"
          cancelHref={`/admin/requests/${id}`}
        />
      )}
    </PageContainer>
  )
}
