import type { Metadata } from 'next'
import Link from 'next/link'

import { Footer } from '@/components/layout/footer'
import { ButtonLink } from '@/components/ui/button'
import { Alert } from '@/components/ui/feedback'
import { SERVICE_NAME } from '@/lib/constants/service'

export const metadata: Metadata = {
  title: 'リンクを確認できませんでした',
}

export default function AuthCodeErrorPage() {
  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-3">
          <Link href="/" className="text-lg font-bold text-brand-700">
            {SERVICE_NAME}
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-md space-y-5 px-4 py-8">
          <h1 className="text-2xl font-bold text-ink-900">リンクを確認できませんでした</h1>

          <Alert variant="error" title="リンクが無効か、有効期限が切れています">
            <p>
              メール内のリンクは一定時間で無効になります。また、一度使用したリンクは再利用できません。
            </p>
          </Alert>

          <div className="flex flex-col gap-2">
            <ButtonLink href="/forgot-password" variant="primary">
              パスワード再設定メールを送り直す
            </ButtonLink>
            <ButtonLink href="/login" variant="secondary">
              ログイン画面へ戻る
            </ButtonLink>
          </div>
        </div>
      </main>

      <Footer />
    </>
  )
}
