import type { Metadata } from 'next'

import { ForgotPasswordForm } from './forgot-password-form'

export const metadata: Metadata = {
  title: 'パスワード再設定',
}

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink-900">パスワード再設定</h1>
        <p className="text-sm leading-relaxed text-ink-500">
          ご登録のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
        </p>
      </div>

      <ForgotPasswordForm />
    </div>
  )
}
