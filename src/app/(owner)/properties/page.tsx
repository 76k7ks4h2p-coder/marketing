import { Building2, Plus } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireOwner } from '@/lib/auth/session'
import { propertyTypeLabel } from '@/lib/constants/properties'
import { listOwnerProperties } from '@/lib/queries/owner'

export const metadata: Metadata = {
  title: '物件一覧',
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string; error?: string }>
}) {
  const [{ supabase, user }, params] = await Promise.all([requireOwner(), searchParams])
  const properties = await listOwnerProperties(supabase, user.id)

  return (
    <PageContainer>
      <PageTitle
        title="物件一覧"
        description="ご所有の物件を登録しておくと、依頼のときに選ぶだけで済みます。"
        actions={
          <ButtonLink href="/properties/new">
            <Plus aria-hidden="true" className="h-4 w-4" />
            物件を登録
          </ButtonLink>
        }
      />

      {params.deleted ? (
        <Alert variant="success" title="物件を削除しました" className="mb-4" />
      ) : null}

      {params.error === 'not-found' ? (
        <Alert variant="error" title="対象の物件が見つかりませんでした" className="mb-4" />
      ) : null}

      {properties.length === 0 ? (
        <EmptyState
          title="登録された物件がありません"
          description="まずは 1 件、物件を登録してください。"
          icon={<Building2 className="h-8 w-8" />}
          action={<ButtonLink href="/properties/new">物件を登録する</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={`/properties/${property.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-300"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{propertyTypeLabel(property.property_type)}</Badge>
                  {property.built_year ? (
                    <span className="text-xs text-ink-500">築 {property.built_year} 年</span>
                  ) : null}
                  {property.unit_count ? (
                    <span className="text-xs text-ink-500">{property.unit_count} 戸</span>
                  ) : null}
                </div>

                <h2 className="mt-1.5 text-base font-semibold break-words text-ink-900">
                  {property.name}
                </h2>

                <p className="mt-1 text-sm break-words text-ink-500">
                  〒{property.postal_code} {property.prefecture}
                  {property.city}
                  {property.address_line1}
                  {property.address_line2 ? ` ${property.address_line2}` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
