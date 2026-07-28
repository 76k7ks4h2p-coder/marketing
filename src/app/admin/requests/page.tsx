import type { Metadata } from 'next'
import Link from 'next/link'

import { RequestFilters } from '@/components/admin/request-filters'
import { Badge, CategoryBadge, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/feedback'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireAdmin } from '@/lib/auth/session'
import { formatShortDate } from '@/lib/format/date'
import { listAdminRequests, type AdminRequestFilters } from '@/lib/queries/admin'

export const metadata: Metadata = {
  title: '案件一覧（管理）',
}

function readFilters(params: Record<string, string | string[] | undefined>): AdminRequestFilters {
  const read = (key: string) => {
    const value = params[key]
    const raw = Array.isArray(value) ? value[0] : value
    return raw && raw.trim() !== '' ? raw.trim() : undefined
  }

  return {
    status: read('status'),
    category: read('category'),
    ownerName: read('ownerName'),
    propertyName: read('propertyName'),
    requestNumber: read('requestNumber'),
  }
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [{ supabase }, params] = await Promise.all([requireAdmin(), searchParams])

  const filters = readFilters(params)
  const requests = await listAdminRequests(supabase, filters)

  return (
    <PageContainer>
      <PageTitle title="案件一覧" description={`${requests.length} 件を表示しています。`} />

      <div className="mb-4">
        <RequestFilters filters={filters} />
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="条件に一致する案件がありません"
          description="絞り込み条件を変更してお試しください。"
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((request) => (
            <li key={request.id}>
              <Link
                href={`/admin/requests/${request.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={request.status} />
                  <CategoryBadge category={request.category} />
                  <Badge tone={request.quoteCount > 0 ? 'info' : 'muted'}>
                    見積もり {request.quoteCount} 件
                  </Badge>
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
                    <dt className="shrink-0">オーナー</dt>
                    <dd className="min-w-0 truncate font-medium text-ink-700">
                      {request.ownerName}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt className="shrink-0">物件</dt>
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
