'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'

import { signUpAction, type SignupResult } from '@/actions/auth'
import { Field, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { PASSWORD_MIN_LENGTH } from '@/lib/validation/auth'

export function SignupForm() {
  const router = useRouter()
  const [state, formAction] = useActionState<SignupResult | null, FormData>(signUpAction, null)

  const needsConfirmation = state?.ok === true && state.data.needsEmailConfirmation
  const signedInImmediately = state?.ok === true && !state.data.needsEmailConfirmation

  useEffect(() => {
    if (signedInImmediately) {
      router.replace('/dashboard')
      router.refresh()
    }
  }, [signedInImmediately, router])

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined

  if (needsConfirmation) {
    return (
      <Alert variant="success" title="確認メールを送信しました">
        <p>
          ご入力いただいたメールアドレス宛に確認メールを送信しました。
          メール内のリンクを開くと登録が完了し、ダッシュボードへ移動します。
        </p>
        <p className="mt-2">メールが届かない場合は、迷惑メールフォルダをご確認ください。</p>
      </Alert>
    )
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok ? (
        <Alert variant="error" title="登録できませんでした">
          {state.message}
        </Alert>
      ) : null}

      <Field label="お名前" htmlFor="signup-name" required errors={fieldErrors?.fullName}>
        <TextInput
          id="signup-name"
          name="fullName"
          autoComplete="name"
          required
          hasError={Boolean(fieldErrors?.fullName)}
          describedBy={fieldErrors?.fullName ? 'signup-name-error' : undefined}
        />
      </Field>

      <Field
        label="会社名・屋号"
        htmlFor="signup-org"
        hint="法人・屋号でご利用の場合にご入力ください。"
        errors={fieldErrors?.organizationName}
      >
        <TextInput
          id="signup-org"
          name="organizationName"
          autoComplete="organization"
          hasError={Boolean(fieldErrors?.organizationName)}
        />
      </Field>

      <Field
        label="電話番号"
        htmlFor="signup-phone"
        hint="日中つながる番号をご入力ください。"
        errors={fieldErrors?.phone}
      >
        <TextInput
          id="signup-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          hasError={Boolean(fieldErrors?.phone)}
          describedBy={fieldErrors?.phone ? 'signup-phone-error' : undefined}
        />
      </Field>

      <Field label="メールアドレス" htmlFor="signup-email" required errors={fieldErrors?.email}>
        <TextInput
          id="signup-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          hasError={Boolean(fieldErrors?.email)}
          describedBy={fieldErrors?.email ? 'signup-email-error' : undefined}
        />
      </Field>

      <Field
        label="パスワード"
        htmlFor="signup-password"
        required
        hint={`${PASSWORD_MIN_LENGTH}文字以上で入力してください。`}
        errors={fieldErrors?.password}
      >
        <TextInput
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          hasError={Boolean(fieldErrors?.password)}
          describedBy={fieldErrors?.password ? 'signup-password-error' : undefined}
        />
      </Field>

      <Field
        label="パスワード（確認）"
        htmlFor="signup-password-confirm"
        required
        errors={fieldErrors?.passwordConfirm}
      >
        <TextInput
          id="signup-password-confirm"
          name="passwordConfirm"
          type="password"
          autoComplete="new-password"
          required
          hasError={Boolean(fieldErrors?.passwordConfirm)}
          describedBy={fieldErrors?.passwordConfirm ? 'signup-password-confirm-error' : undefined}
        />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2.5">
          <input
            id="signup-terms"
            name="agreeToTerms"
            type="checkbox"
            required
            className="mt-1 h-5 w-5 shrink-0 rounded border-slate-400"
            aria-describedby={fieldErrors?.agreeToTerms ? 'signup-terms-error' : undefined}
          />
          <label htmlFor="signup-terms" className="text-sm leading-relaxed text-ink-700">
            <Link href="/terms" className="text-brand-700 underline underline-offset-2">
              利用規約
            </Link>
            と
            <Link href="/privacy" className="text-brand-700 underline underline-offset-2">
              プライバシーポリシー
            </Link>
            に同意します
          </label>
        </div>
        {fieldErrors?.agreeToTerms ? (
          <p id="signup-terms-error" role="alert" className="text-sm text-red-700">
            {fieldErrors.agreeToTerms.join(' ')}
          </p>
        ) : null}
      </div>

      <SubmitButton className="w-full" pendingLabel="登録中…">
        無料で登録する
      </SubmitButton>

      <p className="text-center text-sm text-ink-500">
        すでにアカウントをお持ちの方は{' '}
        <Link href="/login" className="text-brand-700 underline underline-offset-2">
          ログイン
        </Link>
      </p>
    </form>
  )
}
