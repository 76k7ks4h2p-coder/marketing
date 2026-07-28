import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { updateProviderAction } from '@/actions/providers'
import { ProviderForm } from '@/components/admin/provider-form'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireAdmin } from '@/lib/auth/session'
import { getProvider } from '@/lib/queries/admin'

export const metadata: Metadata = {
  title: '業者情報の編集',
}

export default async function EditProviderPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ supabase }, { id }] = await Promise.all([requireAdmin(), params])

  const provider = await getProvider(supabase, id)
  if (!provider) notFound()

  return (
    <PageContainer>
      <PageTitle
        eyebrow={
          <Link href="/admin/providers" className="underline underline-offset-2">
            業者管理へ戻る
          </Link>
        }
        title="業者情報の編集"
        description={provider.name}
      />

      <ProviderForm
        action={updateProviderAction}
        provider={provider}
        submitLabel="変更を保存する"
      />
    </PageContainer>
  )
}
