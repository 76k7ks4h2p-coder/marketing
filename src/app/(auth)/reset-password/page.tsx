import type { Metadata } from 'next'

import { Alert } from '@/components/ui/feedback'
import { getSessionContext } from '@/lib/auth/session'

import { ResetPasswordForm } from './reset-password-form'

export const metadata: Metadata = {
  title: '新しいパスワードの設定',
}

export default async function ResetPasswordPage() {
  // 再設定リンクから /auth/callback を経由すると一時的なセッションが確立される。
  // セッションが無い場合はリンクが無効か期限切れ。
  const context = await getSessionContext()

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink-900">新しいパスワードの設定</h1>
        <p className="text-sm leading-relaxed text-ink-500">新しいパスワードを入力してください。</p>
      </div>

      {context ? (
        <ResetPasswordForm />
      ) : (
        <Alert variant="error" title="リンクが無効です">
          <p>
            パスワード再設定用リンクの有効期限が切れているか、すでに使用済みです。
            お手数ですが、もう一度メールの送信からやり直してください。
          </p>
          <p className="mt-2">
            <a href="/forgot-password" className="underline underline-offset-2">
              パスワード再設定メールを送り直す
            </a>
          </p>
        </Alert>
      )}
    </div>
  )
}
