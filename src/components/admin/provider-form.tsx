'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { ProviderActionResult } from '@/actions/providers'
import { Field, TextArea, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { SERVICE_CATEGORY_OPTIONS } from '@/lib/constants/categories'
import { SERVICE_AREA } from '@/lib/constants/service'
import type { ProviderRow } from '@/lib/types/database'
import { fromLiabilityInsuranceValue } from '@/lib/validation/provider'

const AREA_OPTIONS = [SERVICE_AREA.city, `${SERVICE_AREA.prefecture}内（近隣市町）`] as const

const INSURANCE_OPTIONS = [
  { value: 'yes', label: '加入している' },
  { value: 'no', label: '加入していない' },
  { value: 'unknown', label: '未確認' },
] as const

type Props = {
  action: (
    prevState: ProviderActionResult | null,
    formData: FormData,
  ) => Promise<ProviderActionResult>
  provider?: ProviderRow
  submitLabel: string
}

export function ProviderForm({ action, provider, submitLabel }: Props) {
  const [state, formAction] = useActionState<ProviderActionResult | null, FormData>(action, null)
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined

  const currentAreas = provider?.service_areas ?? [SERVICE_AREA.city]
  const currentCategories = provider?.service_categories ?? []
  const currentInsurance = fromLiabilityInsuranceValue(provider?.has_liability_insurance)

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state && !state.ok ? (
        <Alert variant="error" title="保存できませんでした">
          {state.message}
        </Alert>
      ) : null}

      {provider ? <input type="hidden" name="providerId" value={provider.id} /> : null}

      <Alert variant="info" title="業者情報は一般公開されません">
        オーナーの画面には、公開した見積もりに紐づく<strong>業者名のみ</strong>
        が表示されます。電話番号・メールアドレス・備考は表示されません。
      </Alert>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">基本情報</legend>

        <Field label="会社名または屋号" htmlFor="provider-name" required errors={fieldErrors?.name}>
          <TextInput
            id="provider-name"
            name="name"
            defaultValue={provider?.name ?? ''}
            required
            maxLength={100}
            hasError={Boolean(fieldErrors?.name)}
          />
        </Field>

        <Field label="担当者名" htmlFor="provider-contact" errors={fieldErrors?.contactName}>
          <TextInput
            id="provider-contact"
            name="contactName"
            defaultValue={provider?.contact_name ?? ''}
            maxLength={100}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="電話番号" htmlFor="provider-phone" errors={fieldErrors?.phone}>
            <TextInput
              id="provider-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              defaultValue={provider?.phone ?? ''}
              hasError={Boolean(fieldErrors?.phone)}
            />
          </Field>

          <Field label="メールアドレス" htmlFor="provider-email" errors={fieldErrors?.email}>
            <TextInput
              id="provider-email"
              name="email"
              type="email"
              inputMode="email"
              defaultValue={provider?.email ?? ''}
              hasError={Boolean(fieldErrors?.email)}
            />
          </Field>
        </div>

        <Field label="所在地" htmlFor="provider-address" errors={fieldErrors?.address}>
          <TextInput
            id="provider-address"
            name="address"
            defaultValue={provider?.address ?? ''}
            maxLength={200}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-ink-900">対応地域</legend>
        {AREA_OPTIONS.map((area) => (
          <label key={area} className="flex min-h-11 items-center gap-2.5 text-sm text-ink-700">
            <input
              type="checkbox"
              name="serviceAreas"
              value={area}
              defaultChecked={currentAreas.includes(area)}
              className="h-5 w-5 shrink-0 rounded border-slate-400"
            />
            <span>{area}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-base font-semibold text-ink-900">対応カテゴリー</legend>
        {SERVICE_CATEGORY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex min-h-11 items-center gap-2.5 text-sm text-ink-700"
          >
            <input
              type="checkbox"
              name="serviceCategories"
              value={option.value}
              defaultChecked={currentCategories.includes(option.value)}
              className="h-5 w-5 shrink-0 rounded border-slate-400"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">資格・保険</legend>

        <Field label="資格・許可" htmlFor="provider-licenses" errors={fieldErrors?.licenses}>
          <TextArea
            id="provider-licenses"
            name="licenses"
            defaultValue={provider?.licenses ?? ''}
            rows={3}
            maxLength={500}
          />
        </Field>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ink-700">損害賠償保険</legend>
          {INSURANCE_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 items-center gap-2.5 text-sm text-ink-700"
            >
              <input
                type="radio"
                name="hasLiabilityInsurance"
                value={option.value}
                defaultChecked={currentInsurance === option.value}
                className="h-5 w-5 shrink-0"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">その他</legend>

        <Field
          label="備考"
          htmlFor="provider-notes"
          hint="運営者用のメモです。オーナーには表示されません。"
          errors={fieldErrors?.notes}
        >
          <TextArea
            id="provider-notes"
            name="notes"
            defaultValue={provider?.notes ?? ''}
            rows={4}
            maxLength={2000}
          />
        </Field>

        <label className="flex min-h-11 items-start gap-2.5 text-sm text-ink-700">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={provider ? provider.is_active : true}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400"
          />
          <span>
            有効にする
            <span className="block text-xs text-ink-500">
              無効にすると、新しい見積もりの業者選択に表示されなくなります。
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton pendingLabel="保存中…">{submitLabel}</SubmitButton>
        <Link
          href="/admin/providers"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-base font-medium text-ink-700 hover:bg-slate-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  )
}
