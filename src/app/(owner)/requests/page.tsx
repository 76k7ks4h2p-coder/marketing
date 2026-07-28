import { ClipboardList, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge, CategoryBadge, StatusBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/feedback'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireOwner } from '@/lib/auth/session'
import { formatShortDate } from '@/lib/format/date'
import { listOwnerRequests } from '@/lib/queries/owner'

export const metadata: Metadata = {
  title: '依頼一覧',
}

export default async function RequestsPage() {
  const { supabase, user } = await requireOwner('/requests')
  const requests = await listOwnerRequests(supabase, user.id)

  return (
    <PageContainer>
      <PageTitle
        title="依頼一覧"
        description="ご依頼の進行状況と、公開された見積もりの件数を確認できます。"
        actions={
          <ButtonLink href="/requests/new">
            <Plus aria-hidden="true" className="h-4 w-4" />
            依頼を作成
          </ButtonLink>
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          title="まだ依頼がありません"
          description="物件を登録したうえで、作業の依頼を作成してください。"
          icon={<ClipboardList className="h-8 w-8" />}
          action={<ButtonLink href="/requests/new">依頼を作成する</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={request.status} />
                <CategoryBadge category={request.category} />
                {request.publishedQuoteCount > 0 ? (
                  <Badge tone="action">見積もり {request.publishedQuoteCount} 件</Badge>
                ) : null}
              </div>

              <h2 className="mt-2 text-base font-semibold break-words text-ink-900">
                {request.title}
              </h2>

              <dl className="mt-2 grid gap-1 text-sm text-ink-500 sm:grid-cols-2">
                <div className="flex gap-1.5">
                  <dt className="shrink-0">案件番号</dt>
                  <dd className="font-medium text-ink-700">{request.request_number}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="shrink-0">対象物件</dt>
                  <dd className="min-w-0 truncate font-medium text-ink-700">
                    {request.propertyName}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="shrink-0">依頼日</dt>
                  <dd className="font-medium text-ink-700">
                    {formatShortDate(request.created_at)}
                  </dd>
                </div>
              </dl>

              <div className="mt-3">
                <Link
                  href={`/requests/${request.id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 bg-white px-4 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  詳細を見る
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
