import type { Metadata } from 'next'

import { createPropertyAction } from '@/actions/properties'
import { PropertyForm } from '@/components/owner/property-form'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireOwner } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: '物件の登録',
}

export default async function NewPropertyPage() {
  await requireOwner('/properties/new')

  return (
    <PageContainer>
      <PageTitle
        title="物件の登録"
        description="依頼の対象となる物件を登録します。あとから編集できます。"
      />

      <PropertyForm
        action={createPropertyAction}
        submitLabel="この内容で登録する"
        cancelHref="/properties"
      />
    </PageContainer>
  )
}
