import { Building2 } from 'lucide-react'
import type { Metadata } from 'next'

import { RequestWizard } from '@/components/owner/request-wizard'
import { ButtonLink } from '@/components/ui/button'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireOwner } from '@/lib/auth/session'
import { SERVICE_AREA_LABEL } from '@/lib/constants/service'
import { listOwnerPropertySummaries } from '@/lib/queries/owner'

export const metadata: Metadata = {
  title: '依頼の作成',
}

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>
}) {
  const [{ supabase, user }, params] = await Promise.all([
    requireOwner('/requests/new'),
    searchParams,
  ])
  const properties = await listOwnerPropertySummaries(supabase, user.id)

  // 物件詳細から遷移してきた場合は対象物件を初期選択する
  const initialPropertyId = properties.some((property) => property.id === params.propertyId)
    ? (params.propertyId ?? '')
    : ''

  return (
    <PageContainer>
      <PageTitle
        title="作業依頼の作成"
        description="3 ステップで入力できます。送信後、運営者が内容を確認して見積もりを集めます。"
      />

      {properties.length === 0 ? (
        <>
          <Alert variant="warning" title="先に物件の登録が必要です" className="mb-4">
            依頼は登録済みの物件に対して作成します。{SERVICE_AREA_LABEL}
            の物件を 1 件登録してから、依頼を作成してください。
          </Alert>
          <EmptyState
            title="登録された物件がありません"
            icon={<Building2 className="h-8 w-8" />}
            action={<ButtonLink href="/properties/new">物件を登録する</ButtonLink>}
          />
        </>
      ) : (
        <RequestWizard properties={properties} initialPropertyId={initialPropertyId} />
      )}
    </PageContainer>
  )
}
