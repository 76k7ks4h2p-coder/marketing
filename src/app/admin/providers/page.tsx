import { Plus, Wrench } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireAdmin } from '@/lib/auth/session'
import { serviceCategoryLabel } from '@/lib/constants/categories'
import { listProviders } from '@/lib/queries/admin'

export const metadata: Metadata = {
  title: '業者管理',
}

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; updated?: string }>
}) {
  const [{ supabase }, params] = await Promise.all([requireAdmin(), searchParams])
  const providers = await listProviders(supabase)

  return (
    <PageContainer>
      <PageTitle
        title="業者管理"
        description="協力業者の情報を管理します。オーナーには業者名のみが表示されます。"
        actions={
          <ButtonLink href="/admin/providers/new">
            <Plus aria-hidden="true" className="h-4 w-4" />
            業者を登録
          </ButtonLink>
        }
      />

      {params.created ? (
        <Alert variant="success" title="業者を登録しました" className="mb-4" />
      ) : null}
      {params.updated ? (
        <Alert variant="success" title="業者情報を更新しました" className="mb-4" />
      ) : null}

      {providers.length === 0 ? (
        <EmptyState
          title="業者が登録されていません"
          description="見積もりを登録するには、先に業者を登録してください。"
          icon={<Wrench className="h-8 w-8" />}
          action={<ButtonLink href="/admin/providers/new">業者を登録する</ButtonLink>}
        />
      ) : (
        <ul className="space-y-3">
          {providers.map((provider) => (
            <li key={provider.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={provider.is_active ? 'success' : 'muted'}>
                  {provider.is_active ? '有効' : '無効'}
                </Badge>
                {provider.has_liability_insurance === true ? (
                  <Badge tone="info">損害賠償保険あり</Badge>
                ) : null}
              </div>

              <h2 className="mt-2 text-base font-semibold break-words text-ink-900">
                {provider.name}
              </h2>

              <dl className="mt-2 grid gap-1 text-sm text-ink-500 sm:grid-cols-2">
                <div className="flex gap-1.5">
                  <dt className="shrink-0">担当者</dt>
                  <dd className="font-medium text-ink-700">{provider.contact_name ?? '—'}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="shrink-0">電話</dt>
                  <dd className="font-medium text-ink-700">{provider.phone ?? '—'}</dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="shrink-0">メール</dt>
                  <dd className="min-w-0 truncate font-medium text-ink-700">
                    {provider.email ?? '—'}
                  </dd>
                </div>
                <div className="flex gap-1.5">
                  <dt className="shrink-0">対応地域</dt>
                  <dd className="font-medium text-ink-700">
                    {provider.service_areas?.join('、') ?? '—'}
                  </dd>
                </div>
              </dl>

              {provider.service_categories && provider.service_categories.length > 0 ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {provider.service_categories.map((category) => (
                    <li key={category}>
                      <Badge tone="neutral">{serviceCategoryLabel(category)}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3">
                <Link
                  href={`/admin/providers/${provider.id}/edit`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 bg-white px-4 text-sm font-medium text-brand-700 hover:bg-brand-50"
                >
                  編集
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  )
}
