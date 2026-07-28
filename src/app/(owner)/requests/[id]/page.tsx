import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { QuoteComparison } from '@/components/quotes/quote-comparison'
import { CategoryBadge, StatusBadge, UrgencyBadge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/feedback'
import { FileGallery } from '@/components/ui/file-gallery'
import {
  DescriptionItem,
  DescriptionList,
  PageContainer,
  PageTitle,
  SectionCard,
} from '@/components/ui/page'
import { requireOwner } from '@/lib/auth/session'
import { requestStatusLabel } from '@/lib/constants/statuses'
import { formatBudgetRange } from '@/lib/format/currency'
import { formatJapaneseDate, formatJapaneseDateTime } from '@/lib/format/date'
import { getOwnerRequestDetail } from '@/lib/queries/owner'

export const metadata: Metadata = {
  title: '依頼詳細',
}

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string }>
}) {
  const [{ supabase, user }, { id }, query] = await Promise.all([
    requireOwner(),
    params,
    searchParams,
  ])

  const detail = await getOwnerRequestDetail(supabase, user.id, id)

  // 他人の依頼・存在しない依頼はどちらも 404 として扱う
  if (!detail) notFound()

  const {
    request,
    property,
    requestFiles,
    completionFiles,
    publishedQuotes,
    selection,
    workReport,
  } = detail

  return (
    <PageContainer>
      <PageTitle
        eyebrow={
          <Link href="/requests" className="underline underline-offset-2">
            依頼一覧へ戻る
          </Link>
        }
        title={request.title}
        description={`案件番号 ${request.request_number}`}
      />

      {query.created ? (
        <Alert variant="success" title="依頼を受け付けました" className="mb-4">
          運営者が内容を確認し、地域の業者から見積もりを取得します。見積もりがそろい次第、この画面に表示されます。
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} />
        <CategoryBadge category={request.category} />
        <UrgencyBadge urgency={request.urgency} />
      </div>

      <div className="space-y-4">
        <SectionCard title="現在の状況">
          <p className="text-sm text-ink-900">
            現在のステータス: <strong>{requestStatusLabel(request.status)}</strong>
          </p>
          <p className="mt-1 text-sm text-ink-500">
            最終更新 {formatJapaneseDateTime(request.updated_at)}
          </p>
        </SectionCard>

        <SectionCard title="依頼内容">
          <DescriptionList>
            <DescriptionItem label="案件番号">{request.request_number}</DescriptionItem>
            <DescriptionItem label="依頼日">
              {formatJapaneseDate(request.created_at)}
            </DescriptionItem>
            <DescriptionItem label="対象物件">
              {property ? (
                <Link
                  href={`/properties/${property.id}`}
                  className="text-brand-700 underline underline-offset-2"
                >
                  {property.name}
                </Link>
              ) : (
                '（削除された物件）'
              )}
            </DescriptionItem>
            <DescriptionItem label="対象箇所・部屋番号">
              {request.target_location ?? '指定なし'}
            </DescriptionItem>
            <DescriptionItem label="希望時期">
              {request.preferred_timing ?? '指定なし'}
            </DescriptionItem>
            <DescriptionItem label="ご予算">
              {formatBudgetRange(request.budget_min_yen, request.budget_max_yen)}
            </DescriptionItem>
            <DescriptionItem label="詳細" wide>
              {request.description}
            </DescriptionItem>
          </DescriptionList>
        </SectionCard>

        <SectionCard title={`依頼写真（${requestFiles.length} 件）`}>
          <FileGallery
            files={requestFiles}
            emptyMessage="依頼写真は登録されていません"
            captionPrefix="依頼写真"
          />
        </SectionCard>

        <SectionCard
          title="見積もりの比較"
          description="金額と作業範囲を並べて確認し、1 社をお選びください。"
        >
          <QuoteComparison
            requestId={request.id}
            requestStatus={request.status}
            quotes={publishedQuotes}
            selectedQuoteId={selection?.quote_id ?? null}
            selectedAt={selection?.selected_at ?? null}
          />
        </SectionCard>

        {workReport ? (
          <SectionCard title="完了報告">
            <DescriptionList>
              <DescriptionItem label="完了日">
                {workReport.completed_at ? formatJapaneseDate(workReport.completed_at) : '—'}
              </DescriptionItem>
              <DescriptionItem label="登録日">
                {formatJapaneseDateTime(workReport.created_at)}
              </DescriptionItem>
              <DescriptionItem label="作業内容" wide>
                {workReport.completion_summary}
              </DescriptionItem>
            </DescriptionList>

            <div className="mt-4">
              <h3 className="text-sm font-semibold text-ink-900">
                完了写真（{completionFiles.length} 件）
              </h3>
              <div className="mt-2">
                <FileGallery
                  files={completionFiles}
                  emptyMessage="完了写真は登録されていません"
                  captionPrefix="完了写真"
                />
              </div>
            </div>
          </SectionCard>
        ) : null}
      </div>
    </PageContainer>
  )
}
