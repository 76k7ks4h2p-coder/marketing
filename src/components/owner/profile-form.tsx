'use client'

import { useActionState } from 'react'

import { updateProfileAction, type ProfileResult } from '@/actions/auth'
import { Field, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import type { ProfileRow } from '@/lib/types/database'

export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const [state, formAction] = useActionState<ProfileResult | null, FormData>(
    updateProfileAction,
    null,
  )

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state?.ok ? (
        <Alert variant="success" title="保存しました">
          {state.message}
        </Alert>
      ) : null}

      {state && !state.ok ? (
        <Alert variant="error" title="保存できませんでした">
          {state.message}
        </Alert>
      ) : null}

      <Field label="お名前" htmlFor="profile-name" required errors={fieldErrors?.fullName}>
        <TextInput
          id="profile-name"
          name="fullName"
          defaultValue={profile.full_name ?? ''}
          autoComplete="name"
          required
          maxLength={100}
          hasError={Boolean(fieldErrors?.fullName)}
          describedBy={fieldErrors?.fullName ? 'profile-name-error' : undefined}
        />
      </Field>

      <Field label="会社名・屋号" htmlFor="profile-org" errors={fieldErrors?.organizationName}>
        <TextInput
          id="profile-org"
          name="organizationName"
          defaultValue={profile.organization_name ?? ''}
          autoComplete="organization"
          maxLength={100}
          hasError={Boolean(fieldErrors?.organizationName)}
        />
      </Field>

      <Field
        label="電話番号"
        htmlFor="profile-phone"
        hint="日中つながる番号をご入力ください。"
        errors={fieldErrors?.phone}
      >
        <TextInput
          id="profile-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={profile.phone ?? ''}
          hasError={Boolean(fieldErrors?.phone)}
          describedBy={fieldErrors?.phone ? 'profile-phone-error' : undefined}
        />
      </Field>

      <SubmitButton pendingLabel="保存中…">変更を保存する</SubmitButton>
    </form>
  )
}
