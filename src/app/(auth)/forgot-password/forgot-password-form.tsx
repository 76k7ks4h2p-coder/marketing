'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { requestPasswordResetAction, type ForgotPasswordResult } from '@/actions/auth'
import { Field, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ForgotPasswordResult | null, FormData>(
    requestPasswordResetAction,
    null,
  )

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined

  if (state?.ok) {
    return (
      <Alert variant="success" title="メールを送信しました">
        <p>
          入力されたメールアドレスが登録済みの場合、パスワード再設定用のリンクを送信しました。
          メール内のリンクを開いて新しいパスワードを設定してください。
        </p>
        <p className="mt-2">
          <Link href="/login" className="text-brand-700 underline underline-offset-2">
            ログイン画面へ戻る
          </Link>
        </p>
      </Alert>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <Alert variant="error" title="送信できませんでした">
          {state.message}
        </Alert>
      ) : null}

      <Field label="メールアドレス" htmlFor="forgot-email" required errors={fieldErrors?.email}>
        <TextInput
          id="forgot-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          hasError={Boolean(fieldErrors?.email)}
          describedBy={fieldErrors?.email ? 'forgot-email-error' : undefined}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="送信中…">
        再設定メールを送信
      </SubmitButton>

      <p className="text-center text-sm">
        <Link href="/login" className="text-brand-700 underline underline-offset-2">
          ログイン画面へ戻る
        </Link>
      </p>
    </form>
  )
}
