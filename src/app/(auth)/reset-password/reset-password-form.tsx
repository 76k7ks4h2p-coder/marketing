'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { updatePasswordAction, type ResetPasswordResult } from '@/actions/auth'
import { Field, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/auth'

export function ResetPasswordForm() {
  const [state, formAction] = useActionState<ResetPasswordResult | null, FormData>(
    updatePasswordAction,
    null,
  )

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined

  if (state?.ok) {
    return (
      <Alert variant="success" title="パスワードを変更しました">
        <p>新しいパスワードで引き続きご利用いただけます。</p>
        <p className="mt-2">
          <Link href="/dashboard" className="underline underline-offset-2">
            ダッシュボードへ進む
          </Link>
        </p>
      </Alert>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <Alert variant="error" title="変更できませんでした">
          {state.message}
        </Alert>
      ) : null}

      <Field
        label="新しいパスワード"
        htmlFor="reset-password"
        required
        hint={`${PASSWORD_MIN_LENGTH}文字以上で入力してください。`}
        errors={fieldErrors?.password}
      >
        <TextInput
          id="reset-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          hasError={Boolean(fieldErrors?.password)}
          describedBy={fieldErrors?.password ? 'reset-password-error' : undefined}
        />
      </Field>

      <Field
        label="新しいパスワード（確認）"
        htmlFor="reset-password-confirm"
        required
        errors={fieldErrors?.passwordConfirm}
      >
        <TextInput
          id="reset-password-confirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          hasError={Boolean(fieldErrors?.passwordConfirm)}
          describedBy={fieldErrors?.passwordConfirm ? 'reset-password-confirm-error' : undefined}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="変更中…">
        パスワードを変更する
      </SubmitButton>
    </form>
  )
}
