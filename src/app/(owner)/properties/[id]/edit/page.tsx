import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { updatePropertyAction } from '@/actions/properties'
import { PropertyForm } from '@/components/owner/property-form'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireOwner } from '@/lib/auth/session'
import { getOwnerProperty } from '@/lib/queries/owner'

export const metadata: Metadata = {
  title: '物件情報の編集',
}

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ supabase, user }, { id }] = await Promise.all([requireOwner(), params])

  const property = await getOwnerProperty(supabase, user.id, id)
  if (!property) notFound()

  return (
    <PageContainer>
      <PageTitle
        eyebrow={
          <Link href={`/properties/${property.id}`} className="underline underline-offset-2">
            物件詳細へ戻る
          </Link>
        }
        title="物件情報の編集"
      />

      <PropertyForm
        action={updatePropertyAction}
        property={property}
        submitLabel="変更を保存する"
        cancelHref={`/properties/${property.id}`}
      />
    </PageContainer>
  )
}
