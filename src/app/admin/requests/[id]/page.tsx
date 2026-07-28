import { Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AdminNotesForm } from '@/components/admin/admin-notes-form'
import { CompletionUploader } from '@/components/admin/completion-uploader'
import { DeleteQuoteButton } from '@/components/admin/delete-quote-button'
import { QuotePublicationForm } from '@/components/admin/quote-publication-form'
import { StatusForm } from '@/components/admin/status-form'
import { WorkReportForm } from '@/components/admin/work-report-form'
import { QuoteCard } from '@/components/quotes/quote-card'
import { CategoryBadge, PublicationBadge, StatusBadge, UrgencyBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { FileGallery } from '@/components/ui/file-gallery'
import {
  DescriptionItem,
  DescriptionList,
  PageContainer,
  PageTitle,
  SectionCard,
} from '@/components/ui/page'
import { requireAdmin } from '@/lib/auth/session'
import { propertyTypeLabel } from '@/lib/constants/properties'
import { formatBudgetRange } from '@/lib/format/currency'
import { formatJapaneseDate, formatJapaneseDateTime } from '@/lib/format/date'
import { getAdminRequestDetail } from '@/lib/queries/admin'

export const metadata: Metadata = {
  title: '案件詳細（管理）',
}

const QUOTE_NOTICES: Record<string, string> = {
  created: '見積もりを登録しました。',
  updated: '見積もりを更新しました。',
  deleted: '見積もりを削除しました。',
}

export default async function AdminRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ quote?: string; error?: string }>
}) {
  const [{ supabase }, { id }, query] = await Promise.all([requireAdmin(), params, searchParams])

  const detail = await getAdminRequestDetail(supabase, id)
  if (!detail) notFound()

  const {
    request,
    owner,
    property,
    requestFiles,
    completionFiles,
    quotes,
    selection,
    workReport,
    hasPublishedQuote,
  } = detail

  return (
    <PageContainer>
      <PageTitle
        eyebrow={
          <Link href="/admin/requests" className="underline underline-offset-2">
            案件一覧へ戻る
          </Link>
        }
        title={request.title}
        description={`案件番号 ${request.request_number}`}
        actions={
          <ButtonLink href={`/admin/requests/${request.id}/quotes/new`}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            見積もりを登録
          </ButtonLink>
        }
      />

      {query.quote && QUOTE_NOTICES[query.quote] ? (
        <Alert variant="success" title={QUOTE_NOTICES[query.quote]} className="mb-4" />
      ) : null}

      {query.error ? (
        <Alert variant="error" title="処理できませんでした" className="mb-4">
          {query.error}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={request.status} />
        <CategoryBadge category={request.category} />
        <UrgencyBadge urgency={request.urgency} />
      </div>

      <div className="space-y-4">
        {/* 依頼内容 */}
        <SectionCard title="依頼内容">
          <DescriptionList>
            <DescriptionItem label="案件番号">{request.request_number}</DescriptionItem>
            <DescriptionItem label="依頼日">
              {formatJapaneseDateTime(request.created_at)}
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
            <DescriptionItem label="最終更新">
              {formatJapaneseDateTime(request.updated_at)}
            </DescriptionItem>
            <DescriptionItem label="詳細" wide>
              {request.description}
            </DescriptionItem>
          </DescriptionList>
        </SectionCard>

        {/* 依頼写真 */}
        <SectionCard title={`依頼写真（${requestFiles.length} 件）`}>
          <FileGallery
            files={requestFiles}
            emptyMessage="依頼写真は登録されていません"
            captionPrefix="依頼写真"
          />
        </SectionCard>

        {/* オーナー情報 */}
        <SectionCard title="オーナー情報">
          <DescriptionList>
            <DescriptionItem label="お名前">{owner?.full_name ?? '未登録'}</DescriptionItem>
            <DescriptionItem label="会社名・屋号">
              {owner?.organization_name ?? '未登録'}
            </DescriptionItem>
            <DescriptionItem label="電話番号">{owner?.phone ?? '未登録'}</DescriptionItem>
            <DescriptionItem label="登録日">
              {owner ? formatJapaneseDate(owner.created_at) : '—'}
            </DescriptionItem>
          </DescriptionList>
        </SectionCard>

        {/* 物件情報 */}
        <SectionCard title="物件情報">
          {property ? (
            <DescriptionList>
              <DescriptionItem label="物件名">{property.name}</DescriptionItem>
              <DescriptionItem label="物件種別">
                {propertyTypeLabel(property.property_type)}
              </DescriptionItem>
              <DescriptionItem label="所在地" wide>
                〒{property.postal_code} {property.prefecture}
                {property.city}
                {property.address_line1}
                {property.address_line2 ? ` ${property.address_line2}` : ''}
              </DescriptionItem>
              <DescriptionItem label="構造">
                {property.building_structure ?? '未登録'}
              </DescriptionItem>
              <DescriptionItem label="築年">
                {property.built_year ? `${property.built_year} 年` : '未登録'}
              </DescriptionItem>
              <DescriptionItem label="戸数">
                {property.unit_count ? `${property.unit_count} 戸` : '未登録'}
              </DescriptionItem>
              <DescriptionItem label="面積">
                {property.area_sqm ? `${property.area_sqm} ㎡` : '未登録'}
              </DescriptionItem>
              {property.notes ? (
                <DescriptionItem label="備考" wide>
                  {property.notes}
                </DescriptionItem>
              ) : null}
            </DescriptionList>
          ) : (
            <p className="text-sm text-ink-500">物件情報が見つかりませんでした。</p>
          )}
        </SectionCard>

        {/* ステータス変更 */}
        <SectionCard title="ステータスの変更">
          <StatusForm
            requestId={request.id}
            currentStatus={request.status}
            hasPublishedQuote={hasPublishedQuote}
          />
        </SectionCard>

        {/* 管理者メモ */}
        <SectionCard title="管理者メモ" description="オーナーには表示されません。">
          <AdminNotesForm requestId={request.id} adminNotes={request.admin_notes} />
        </SectionCard>

        {/* 見積もり */}
        <SectionCard
          title={`見積もり（${quotes.length} 件）`}
          description="公開すると、オーナーの依頼詳細画面に表示されます。"
          actions={
            <ButtonLink
              href={`/admin/requests/${request.id}/quotes/new`}
              variant="secondary"
              size="sm"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              追加
            </ButtonLink>
          }
        >
          {quotes.length === 0 ? (
            <EmptyState
              title="見積もりが登録されていません"
              description="業者から取得した見積もりを登録してください。"
              action={
                <ButtonLink href={`/admin/requests/${request.id}/quotes/new`}>
                  見積もりを登録する
                </ButtonLink>
              }
            />
          ) : (
            <ul className="space-y-4">
              {quotes.map((quote) => {
                const isSelected = selection?.quote_id === quote.id

                return (
                  <li key={quote.id}>
                    <QuoteCard
                      quote={quote}
                      isSelected={isSelected}
                      adminSlot={<PublicationBadge status={quote.publication_status} />}
                      action={
                        <div className="flex flex-col gap-3">
                          <QuotePublicationForm
                            quoteId={quote.id}
                            publicationStatus={quote.publication_status}
                            isSelected={isSelected}
                          />
                          <div className="flex flex-wrap gap-2">
                            <ButtonLink
                              href={`/admin/requests/${request.id}/quotes/${quote.id}/edit`}
                              variant="secondary"
                              size="sm"
                            >
                              編集
                            </ButtonLink>
                            <DeleteQuoteButton
                              quoteId={quote.id}
                              requestId={request.id}
                              providerName={quote.providerName}
                              disabled={isSelected}
                            />
                          </div>
                        </div>
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>

        {/* 選択結果 */}
        <SectionCard title="オーナーの選択結果">
          {selection ? (
            <DescriptionList>
              <DescriptionItem label="選択された業者">
                {quotes.find((quote) => quote.id === selection.quote_id)?.providerName ?? '—'}
              </DescriptionItem>
              <DescriptionItem label="選択日時">
                {formatJapaneseDateTime(selection.selected_at)}
              </DescriptionItem>
            </DescriptionList>
          ) : (
            <p className="text-sm text-ink-500">まだ選択されていません。</p>
          )}
        </SectionCard>

        {/* 完了報告 */}
        <SectionCard title="完了報告">
          <WorkReportForm
            requestId={request.id}
            workReport={workReport}
            currentStatus={request.status}
          />
        </SectionCard>

        {/* 完了写真 */}
        <SectionCard title={`完了写真（${completionFiles.length} 件）`}>
          <div className="space-y-4">
            <FileGallery
              files={completionFiles}
              emptyMessage="完了写真は登録されていません"
              captionPrefix="完了写真"
            />
            <CompletionUploader
              requestId={request.id}
              ownerId={request.owner_id}
              existingCount={completionFiles.length}
            />
          </div>
        </SectionCard>
      </div>
    </PageContainer>
  )
}
