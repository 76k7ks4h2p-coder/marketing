import { Building2, ClipboardList, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { CategoryBadge, StatusBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { PageContainer, PageTitle, SectionCard, StatCard } from '@/components/ui/page'
import { requireOwner } from '@/lib/auth/session'
import { formatShortDate } from '@/lib/format/date'
import { getOwnerDashboard } from '@/lib/queries/owner'

export const metadata: Metadata = {
  title: 'ダッシュボード',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>
}) {
  const [{ supabase, user, profile }, params] = await Promise.all([requireOwner(), searchParams])

  const dashboard = await getOwnerDashboard(supabase, user.id)
  const displayName = profile.full_name ?? profile.organization_name ?? 'オーナー'

  return (
    <PageContainer>
      <PageTitle
        title={`${displayName} 様のダッシュボード`}
        description="登録物件と依頼の状況をまとめて確認できます。"
      />

      {params.denied === 'admin' ? (
        <Alert variant="warning" title="管理画面へのアクセス権限がありません" className="mb-4">
          管理画面は運営管理者のみが利用できます。オーナーダッシュボードを表示しています。
        </Alert>
      ) : null}

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="登録物件数" value={dashboard.propertyCount} href="/properties" />
        <StatCard label="対応中の依頼" value={dashboard.activeRequestCount} href="/requests" />
        <StatCard
          label="見積もり確認待ち"
          value={dashboard.quotesReadyCount}
          tone={dashboard.quotesReadyCount > 0 ? 'highlight' : 'default'}
          href="/requests"
        />
        <StatCard label="完了した依頼" value={dashboard.completedCount} href="/requests" />
      </div>

      {dashboard.quotesReadyCount > 0 ? (
        <Alert variant="info" title="確認をお待ちしている見積もりがあります" className="mb-5">
          <p>
            見積もりがそろった依頼が {dashboard.quotesReadyCount}{' '}
            件あります。内容を比較して業者をお選びください。
          </p>
          <p className="mt-2">
            <Link href="/requests" className="underline underline-offset-2">
              依頼一覧を確認する
            </Link>
          </p>
        </Alert>
      ) : null}

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <ButtonLink href="/requests/new" size="lg">
          <Plus aria-hidden="true" className="h-4 w-4" />
          新しい依頼を作成する
        </ButtonLink>
        <ButtonLink href="/properties/new" variant="secondary" size="lg">
          <Building2 aria-hidden="true" className="h-4 w-4" />
          物件を登録する
        </ButtonLink>
      </div>

      <SectionCard
        title="最近の依頼"
        actions={
          dashboard.recentRequests.length > 0 ? (
            <Link href="/requests" className="text-sm text-brand-700 underline underline-offset-2">
              すべて見る
            </Link>
          ) : null
        }
      >
        {dashboard.recentRequests.length === 0 ? (
          <EmptyState
            title="まだ依頼がありません"
            description="物件を登録したうえで、最初の依頼を作成してみましょう。"
            icon={<ClipboardList className="h-8 w-8" />}
            action={<ButtonLink href="/requests/new">依頼を作成する</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {dashboard.recentRequests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
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
                    {request.propertyName} / {request.request_number}
                    {request.publishedQuoteCount > 0
                      ? ` / 見積もり ${request.publishedQuoteCount} 件`
                      : ''}
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
