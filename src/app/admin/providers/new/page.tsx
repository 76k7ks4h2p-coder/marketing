import type { Metadata } from 'next'
import Link from 'next/link'

import { createProviderAction } from '@/actions/providers'
import { ProviderForm } from '@/components/admin/provider-form'
import { PageContainer, PageTitle } from '@/components/ui/page'
import { requireAdmin } from '@/lib/auth/session'

export const metadata: Metadata = {
  title: '業者の登録',
}

export default async function NewProviderPage() {
  await requireAdmin()

  return (
    <PageContainer>
      <PageTitle
        eyebrow={
          <Link href="/admin/providers" className="underline underline-offset-2">
            業者管理へ戻る
          </Link>
        }
        title="業者の登録"
      />

      <ProviderForm action={createProviderAction} submitLabel="この内容で登録する" />
    </PageContainer>
  )
}
