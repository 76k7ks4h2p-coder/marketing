import type { Metadata } from 'next'

import { Alert } from '@/components/ui/feedback'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'ログイン',
}

const REASON_MESSAGES: Record<
  string,
  { variant: 'info' | 'warning'; title: string; body: string }
> = {
  unauthenticated: {
    variant: 'warning',
    title: 'ログインが必要です',
    body: 'このページを表示するにはログインしてください。ログイン後、元のページへ戻ります。',
  },
  'signed-out': {
    variant: 'info',
    title: 'ログアウトしました',
    body: 'ご利用ありがとうございました。',
  },
  'password-updated': {
    variant: 'info',
    title: 'パスワードを変更しました',
    body: '新しいパスワードでログインしてください。',
  },
}

/** ログイン後の戻り先。同一サイト内の絶対パスのみ許可する。 */
function sanitizeRedirect(value: string | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; reason?: string }>
}) {
  const params = await searchParams
  const notice = params.reason ? REASON_MESSAGES[params.reason] : undefined

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-ink-900">ログイン</h1>
        <p className="text-sm text-ink-500">
          登録済みのメールアドレスとパスワードを入力してください。
        </p>
      </div>

      {notice ? (
        <Alert variant={notice.variant} title={notice.title}>
          {notice.body}
        </Alert>
      ) : null}

      <LoginForm redirectTo={sanitizeRedirect(params.redirectTo)} />
    </div>
  )
}
