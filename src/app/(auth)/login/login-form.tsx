'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import { signInAction, type LoginResult } from '@/actions/auth'
import { Field, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useActionState<LoginResult | null, FormData>(signInAction, null)

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <Alert variant="error" title="ログインできませんでした">
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="redirectTo" value={redirectTo} />

      <Field label="メールアドレス" htmlFor="login-email" required errors={fieldErrors?.email}>
        <TextInput
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          hasError={Boolean(fieldErrors?.email)}
          describedBy={fieldErrors?.email ? 'login-email-error' : undefined}
        />
      </Field>

      <Field label="パスワード" htmlFor="login-password" required errors={fieldErrors?.password}>
        <TextInput
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          hasError={Boolean(fieldErrors?.password)}
          describedBy={fieldErrors?.password ? 'login-password-error' : undefined}
        />
      </Field>

      <SubmitButton className="w-full" pendingLabel="ログイン中…">
        ログイン
      </SubmitButton>

      <div className="space-y-2 text-center text-sm">
        <p>
          <Link href="/forgot-password" className="text-brand-700 underline underline-offset-2">
            パスワードをお忘れの方
          </Link>
        </p>
        <p className="text-ink-500">
          アカウントをお持ちでない方は{' '}
          <Link href="/signup" className="text-brand-700 underline underline-offset-2">
            新規登録
          </Link>
        </p>
      </div>
    </form>
  )
}
