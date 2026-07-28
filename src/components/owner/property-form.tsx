'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import type { PropertyActionResult } from '@/actions/properties'
import { Field, Select, StaticValue, TextArea, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  BUILDING_STRUCTURE_SUGGESTIONS,
  MIN_BUILT_YEAR,
  PROPERTY_TYPE_OPTIONS,
} from '@/lib/constants/properties'
import { OUT_OF_AREA_MESSAGE, SERVICE_AREA } from '@/lib/constants/service'
import type { PropertyRow } from '@/lib/types/database'

type Props = {
  action: (
    prevState: PropertyActionResult | null,
    formData: FormData,
  ) => Promise<PropertyActionResult>
  property?: PropertyRow
  submitLabel: string
  cancelHref: string
}

export function PropertyForm({ action, property, submitLabel, cancelHref }: Props) {
  const [state, formAction] = useActionState<PropertyActionResult | null, FormData>(action, null)
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined

  const currentYear = new Date().getFullYear()

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state && !state.ok ? (
        <Alert variant="error" title="保存できませんでした">
          {state.message}
        </Alert>
      ) : null}

      {property ? <input type="hidden" name="propertyId" value={property.id} /> : null}

      {/* 都道府県・市区町村は MVP では固定値。hidden で送信し、画面には読み取り専用で見せる。 */}
      <input type="hidden" name="prefecture" value={SERVICE_AREA.prefecture} />
      <input type="hidden" name="city" value={SERVICE_AREA.city} />

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">基本情報</legend>

        <Field
          label="物件名"
          htmlFor="property-name"
          required
          hint="管理しやすい名前を入力してください（例: 〇〇ハイツ）。"
          errors={fieldErrors?.name}
        >
          <TextInput
            id="property-name"
            name="name"
            defaultValue={property?.name ?? ''}
            required
            maxLength={100}
            hasError={Boolean(fieldErrors?.name)}
            describedBy="property-name-hint"
          />
        </Field>

        <Field label="物件種別" htmlFor="property-type" required errors={fieldErrors?.propertyType}>
          <Select
            id="property-type"
            name="propertyType"
            defaultValue={property?.property_type ?? ''}
            required
            hasError={Boolean(fieldErrors?.propertyType)}
          >
            <option value="" disabled>
              選択してください
            </option>
            {PROPERTY_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">所在地</legend>

        <Alert
          variant="info"
          title={`対応エリアは${SERVICE_AREA.prefecture}${SERVICE_AREA.city}のみです`}
        >
          {OUT_OF_AREA_MESSAGE}
        </Alert>

        <Field
          label="郵便番号"
          htmlFor="property-postal"
          required
          hint="ハイフンあり・なしどちらでも入力できます（例: 720-0001）。"
          errors={fieldErrors?.postalCode}
        >
          <TextInput
            id="property-postal"
            name="postalCode"
            defaultValue={property?.postal_code ?? ''}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="720-0001"
            required
            hasError={Boolean(fieldErrors?.postalCode)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink-700">都道府県</span>
            <StaticValue>{SERVICE_AREA.prefecture}</StaticValue>
          </div>
          <div className="space-y-1.5">
            <span className="block text-sm font-medium text-ink-700">市区町村</span>
            <StaticValue>{SERVICE_AREA.city}</StaticValue>
          </div>
        </div>

        <Field
          label="町名・番地"
          htmlFor="property-address1"
          required
          errors={fieldErrors?.addressLine1}
        >
          <TextInput
            id="property-address1"
            name="addressLine1"
            defaultValue={property?.address_line1 ?? ''}
            autoComplete="address-line1"
            required
            maxLength={200}
            hasError={Boolean(fieldErrors?.addressLine1)}
          />
        </Field>

        <Field
          label="建物名・部屋番号"
          htmlFor="property-address2"
          errors={fieldErrors?.addressLine2}
        >
          <TextInput
            id="property-address2"
            name="addressLine2"
            defaultValue={property?.address_line2 ?? ''}
            autoComplete="address-line2"
            maxLength={100}
            hasError={Boolean(fieldErrors?.addressLine2)}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">建物の情報</legend>

        <Field label="構造" htmlFor="property-structure" errors={fieldErrors?.buildingStructure}>
          <TextInput
            id="property-structure"
            name="buildingStructure"
            defaultValue={property?.building_structure ?? ''}
            list="building-structures"
            maxLength={50}
            hasError={Boolean(fieldErrors?.buildingStructure)}
          />
          <datalist id="building-structures">
            {BUILDING_STRUCTURE_SUGGESTIONS.map((structure) => (
              <option key={structure} value={structure} />
            ))}
          </datalist>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="築年（西暦）" htmlFor="property-built-year" errors={fieldErrors?.builtYear}>
            <TextInput
              id="property-built-year"
              name="builtYear"
              type="number"
              inputMode="numeric"
              min={MIN_BUILT_YEAR}
              max={currentYear + 1}
              step={1}
              defaultValue={property?.built_year ?? ''}
              hasError={Boolean(fieldErrors?.builtYear)}
            />
          </Field>

          <Field label="戸数" htmlFor="property-unit-count" errors={fieldErrors?.unitCount}>
            <TextInput
              id="property-unit-count"
              name="unitCount"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              defaultValue={property?.unit_count ?? ''}
              hasError={Boolean(fieldErrors?.unitCount)}
            />
          </Field>
        </div>

        <Field label="面積（㎡）" htmlFor="property-area" errors={fieldErrors?.areaSqm}>
          <TextInput
            id="property-area"
            name="areaSqm"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            defaultValue={property?.area_sqm ?? ''}
            hasError={Boolean(fieldErrors?.areaSqm)}
          />
        </Field>

        <Field
          label="備考"
          htmlFor="property-notes"
          hint="鍵の受け渡し方法、駐車場の有無など、業者に伝えておきたいことがあればご記入ください。"
          errors={fieldErrors?.notes}
        >
          <TextArea
            id="property-notes"
            name="notes"
            defaultValue={property?.notes ?? ''}
            maxLength={2000}
            rows={4}
            hasError={Boolean(fieldErrors?.notes)}
          />
        </Field>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row">
        <SubmitButton pendingLabel="保存中…">{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-base font-medium text-ink-700 hover:bg-slate-50"
        >
          キャンセル
        </Link>
      </div>
    </form>
  )
}
