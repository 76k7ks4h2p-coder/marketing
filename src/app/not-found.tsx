import Link from 'next/link'

import { ButtonLink } from '@/components/ui/button'
import { SERVICE_NAME } from '@/lib/constants/service'

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-sm font-medium text-brand-600">404</p>
        <h1 className="text-2xl font-bold text-ink-900">ページが見つかりませんでした</h1>
        <p className="text-sm leading-relaxed text-ink-500">
          URL が変更されたか、アクセス権限のないページの可能性があります。
          お心当たりのないアクセスであれば、ログイン状態をご確認ください。
        </p>

        <div className="flex flex-col gap-2 pt-2">
          <ButtonLink href="/dashboard">ダッシュボードへ戻る</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            {SERVICE_NAME} トップへ
          </ButtonLink>
        </div>

        <p className="pt-2 text-sm">
          <Link href="/login" className="text-brand-700 underline underline-offset-2">
            ログイン画面へ
          </Link>
        </p>
      </div>
    </main>
  )
}
