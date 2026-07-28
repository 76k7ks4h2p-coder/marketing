import { Pencil, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { CategoryBadge, StatusBadge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Alert, EmptyState } from '@/components/ui/feedback'
import {
  DescriptionItem,
  DescriptionList,
  PageContainer,
  PageTitle,
  SectionCard,
} from '@/components/ui/page'
import { DeletePropertyButton } from '@/components/owner/delete-property-button'
import { requireOwner } from '@/lib/auth/session'
import { propertyTypeLabel } from '@/lib/constants/properties'
import { formatNumber } from '@/lib/format/currency'
import { formatJapaneseDate, formatShortDate } from '@/lib/format/date'
import { getOwnerProperty, listOwnerRequests } from '@/lib/queries/owner'

export const metadata: Metadata = {
  title: '物件詳細',
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ created?: string; updated?: string; error?: string }>
}) {
  const [{ supabase, user }, { id }, query] = await Promise.all([
    requireOwner(),
    params,
    searchParams,
  ])

  const property = await getOwnerProperty(supabase, user.id, id)

  // 他人の物件・存在しない物件はどちらも 404 として扱う（存在の有無を漏らさない）
  if (!property) notFound()

  const allRequests = await listOwnerRequests(supabase, user.id)
  const relatedRequests = allRequests.filter((request) => request.property_id === property.id)

  return (
    <PageContainer>
      <PageTitle
        eyebrow={
          <Link href="/properties" className="underline underline-offset-2">
            物件一覧へ戻る
          </Link>
        }
        title={property.name}
        description={propertyTypeLabel(property.property_type)}
        actions={
          <>
            <ButtonLink href={`/properties/${property.id}/edit`} variant="secondary">
              <Pencil aria-hidden="true" className="h-4 w-4" />
              編集
            </ButtonLink>
            <ButtonLink href={`/requests/new?propertyId=${property.id}`}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              この物件で依頼
            </ButtonLink>
          </>
        }
      />

      {query.created ? (
        <Alert variant="success" title="物件を登録しました" className="mb-4">
          続けて作業の依頼を作成できます。
        </Alert>
      ) : null}

      {query.updated ? (
        <Alert variant="success" title="物件情報を更新しました" className="mb-4" />
      ) : null}

      {query.error === 'has-requests' ? (
        <Alert variant="error" title="この物件は削除できません" className="mb-4">
          依頼が紐づいている物件は削除できません。依頼の履歴を残すため、そのまま保持されます。
        </Alert>
      ) : query.error ? (
        <Alert variant="error" title="処理できませんでした" className="mb-4">
          {query.error}
        </Alert>
      ) : null}

      <div className="space-y-4">
        <SectionCard title="物件情報">
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
              {property.unit_count ? `${formatNumber(property.unit_count)} 戸` : '未登録'}
            </DescriptionItem>
            <DescriptionItem label="面積">
              {property.area_sqm ? `${property.area_sqm} ㎡` : '未登録'}
            </DescriptionItem>
            {property.notes ? (
              <DescriptionItem label="備考" wide>
                {property.notes}
              </DescriptionItem>
            ) : null}
            <DescriptionItem label="登録日">
              {formatJapaneseDate(property.created_at)}
            </DescriptionItem>
          </DescriptionList>
        </SectionCard>

        <SectionCard title={`この物件の依頼（${relatedRequests.length} 件）`}>
          {relatedRequests.length === 0 ? (
            <EmptyState
              title="この物件の依頼はまだありません"
              action={
                <ButtonLink href={`/requests/new?propertyId=${property.id}`}>
                  依頼を作成する
                </ButtonLink>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {relatedRequests.map((request) => (
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        {relatedRequests.length === 0 ? (
          <SectionCard title="物件の削除" description="依頼が紐づいていない物件のみ削除できます。">
            <DeletePropertyButton propertyId={property.id} propertyName={property.name} />
          </SectionCard>
        ) : null}
      </div>
    </PageContainer>
  )
}
