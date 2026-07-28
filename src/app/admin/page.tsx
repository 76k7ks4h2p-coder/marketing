import type { Metadata } from 'next'
import Link from 'next/link'

import { CategoryBadge, StatusBadge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/feedback'
import { PageContainer, PageTitle, SectionCard, StatCard } from '@/components/ui/page'
import { requireAdmin } from '@/lib/auth/session'
import { formatShortDate } from '@/lib/format/date'
import { getAdminDashboard } from '@/lib/queries/admin'

export const metadata: Metadata = {
  title: '管理ダッシュボード',
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin()
  const dashboard = await getAdminDashboard(supabase)

  return (
    <PageContainer>
      <PageTitle title="管理ダッシュボード" description="案件の状況を一覧で確認できます。" />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="新規依頼（依頼受付）"
          value={dashboard.counts.submitted}
          tone={dashboard.counts.submitted > 0 ? 'highlight' : 'default'}
          href="/admin/requests?status=submitted"
        />
        <StatCard
          label="内容確認中"
          value={dashboard.counts.reviewing}
          href="/admin/requests?status=reviewing"
        />
        <StatCard
          label="見積もり取得中"
          value={dashboard.counts.collectingQuotes}
          href="/admin/requests?status=collecting_quotes"
        />
        <StatCard
          label="オーナー選択待ち"
          value={dashboard.counts.quotesReady}
          href="/admin/requests?status=quotes_ready"
        />
        <StatCard
          label="作業中（日程調整含む）"
          value={dashboard.counts.inProgress}
          href="/admin/requests?status=in_progress"
        />
        <StatCard
          label="完了"
          value={dashboard.counts.completed}
          href="/admin/requests?status=completed"
        />
      </div>

      <SectionCard
        title="最近の案件"
        actions={
          <Link
            href="/admin/requests"
            className="text-sm text-brand-700 underline underline-offset-2"
          >
            すべて見る
          </Link>
        }
      >
        {dashboard.recentRequests.length === 0 ? (
          <EmptyState title="案件がまだありません" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {dashboard.recentRequests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/admin/requests/${request.id}`}
                  className="flex min-h-14 flex-col gap-1.5 py-3 hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={request.status} />
                    <CategoryBadge category={request.category} />
                    <span className="text-xs text-ink-500">
                      {formatShortDate(request.created_at)}
                    </span>
                  </div>
                  <span className="text-sm font-medium break-words text-ink-900">
                    {request.title}
                  </span>
                  <span className="text-xs text-ink-500">
                    {request.request_number} / {request.ownerName} / {request.propertyName} /
                    見積もり {request.quoteCount} 件
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageContainer>
  )
}
