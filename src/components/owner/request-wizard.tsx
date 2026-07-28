'use client'

import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { registerRequestFilesAction } from '@/actions/files'
import { createServiceRequestAction } from '@/actions/requests'
import { FilePicker } from '@/components/owner/file-picker'
import { Button } from '@/components/ui/button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SERVICE_CATEGORY_OPTIONS, serviceCategoryLabel } from '@/lib/constants/categories'
import { URGENCY_OPTIONS, urgencyLabel } from '@/lib/constants/urgency'
import { formatBudgetRange } from '@/lib/format/currency'
import type { PropertySummary } from '@/lib/queries/owner'
import { removeUploadedPaths, uploadRequestFiles } from '@/lib/upload-client'
import type { FieldErrorMap } from '@/lib/validation/common'
import { toFieldErrors } from '@/lib/validation/common'
import { requestStep1Schema, requestStep2Schema } from '@/lib/validation/request'

type FormState = {
  propertyId: string
  category: string
  targetLocation: string
  urgency: string
  title: string
  description: string
  preferredTiming: string
  budgetMinYen: string
  budgetMaxYen: string
  additionalNotes: string
}

const INITIAL_STATE: FormState = {
  propertyId: '',
  category: '',
  targetLocation: '',
  urgency: 'normal',
  title: '',
  description: '',
  preferredTiming: '',
  budgetMinYen: '',
  budgetMaxYen: '',
  additionalNotes: '',
}

const STEP_LABELS = ['対象と作業内容', '依頼の詳細', '写真と確認'] as const

export function RequestWizard({
  properties,
  initialPropertyId = '',
}: {
  properties: PropertySummary[]
  initialPropertyId?: string
}) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [values, setValues] = useState<FormState>({
    ...INITIAL_STATE,
    propertyId: initialPropertyId,
  })
  const [files, setFiles] = useState<File[]>([])
  const [fileError, setFileError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)
  // 二重送信の防止
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function goToStep2() {
    const parsed = requestStep1Schema.safeParse({
      propertyId: values.propertyId,
      category: values.category,
      targetLocation: values.targetLocation,
      urgency: values.urgency,
    })

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error))
      setFormError('入力内容をご確認ください。')
      return
    }

    setFieldErrors({})
    setFormError(null)
    setStep(2)
  }

  function goToStep3() {
    const parsed = requestStep2Schema.safeParse({
      title: values.title,
      description: values.description,
      preferredTiming: values.preferredTiming,
      budgetMinYen: values.budgetMinYen,
      budgetMaxYen: values.budgetMaxYen,
      additionalNotes: values.additionalNotes,
    })

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error))
      setFormError('入力内容をご確認ください。')
      return
    }

    setFieldErrors({})
    setFormError(null)
    setStep(3)
  }

  function buildFormData(): FormData {
    const formData = new FormData()
    for (const [key, value] of Object.entries(values)) {
      formData.set(key, value)
    }
    return formData
  }

  async function submit() {
    if (isSubmitting) return

    setIsSubmitting(true)
    setFormError(null)
    setWarning(null)

    try {
      const result = await createServiceRequestAction(null, buildFormData())

      if (!result.ok) {
        setFormError(result.message)
        setFieldErrors(result.fieldErrors ?? {})
        setIsSubmitting(false)
        return
      }

      const { requestId, ownerId } = result.data

      if (files.length > 0) {
        const upload = await uploadRequestFiles({ ownerId, requestId, kind: 'request', files })

        if (!upload.ok) {
          // 依頼自体は登録済み。写真だけ失敗したことを伝えて詳細画面へ進む。
          setWarning(
            `${upload.message} 依頼は登録されました。写真は依頼詳細から運営者へお送りください。`,
          )
        } else {
          const register = await registerRequestFilesAction({
            requestId,
            files: upload.files,
          })

          if (!register.ok) {
            // DB 登録に失敗したら Storage 上のファイルを片付ける
            await removeUploadedPaths(upload.files.map((file) => file.storagePath))
            setWarning(`${register.message} 依頼は登録されましたが、写真の登録に失敗しました。`)
          }
        }
      }

      router.push(`/requests/${requestId}?created=1`)
    } catch (error) {
      console.error('[OwnerBase] RequestWizard.submit', error)
      setFormError('送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。')
      setIsSubmitting(false)
    }
  }

  const selectedProperty = properties.find((property) => property.id === values.propertyId)

  return (
    <div className="space-y-5">
      {/* ステップ表示 */}
      <ol className="flex gap-2" aria-label="入力の進捗">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isCurrent = stepNumber === step
          const isDone = stepNumber < step

          return (
            <li key={label} className="min-w-0 flex-1">
              <div
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'rounded-lg border px-2 py-2 text-center text-xs font-medium',
                  isCurrent
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : isDone
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                      : 'border-slate-200 bg-white text-ink-500',
                ].join(' ')}
              >
                <span className="block">STEP {stepNumber}</span>
                <span className="block truncate">{label}</span>
              </div>
            </li>
          )
        })}
      </ol>

      {formError ? (
        <Alert variant="error" title="送信できませんでした">
          {formError}
        </Alert>
      ) : null}

      {warning ? (
        <Alert variant="warning" title="一部の処理が完了しませんでした">
          {warning}
        </Alert>
      ) : null}

      {/* onSubmit で制御するため form の action は使わない（多段入力のため） */}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (step === 1) goToStep2()
          else if (step === 2) goToStep3()
          else void submit()
        }}
        className="space-y-5"
        noValidate
      >
        {step === 1 ? (
          <fieldset className="space-y-4">
            <legend className="sr-only">対象と作業内容</legend>

            <Field
              label="対象物件"
              htmlFor="request-property"
              required
              errors={fieldErrors.propertyId}
            >
              <Select
                id="request-property"
                value={values.propertyId}
                onChange={(event) => update('propertyId', event.target.value)}
                required
                hasError={Boolean(fieldErrors.propertyId)}
              >
                <option value="" disabled>
                  選択してください
                </option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="作業カテゴリー"
              htmlFor="request-category"
              required
              errors={fieldErrors.category}
            >
              <Select
                id="request-category"
                value={values.category}
                onChange={(event) => update('category', event.target.value)}
                required
                hasError={Boolean(fieldErrors.category)}
              >
                <option value="" disabled>
                  選択してください
                </option>
                {SERVICE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="対象箇所・部屋番号"
              htmlFor="request-location"
              hint="例: 201号室、共用階段、南側敷地"
              errors={fieldErrors.targetLocation}
            >
              <TextInput
                id="request-location"
                value={values.targetLocation}
                onChange={(event) => update('targetLocation', event.target.value)}
                maxLength={100}
                hasError={Boolean(fieldErrors.targetLocation)}
              />
            </Field>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-ink-700">
                緊急度
                <span className="ml-1 text-red-600">
                  <span aria-hidden="true">*</span>
                  <span className="sr-only">（必須）</span>
                </span>
              </legend>
              {URGENCY_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex min-h-11 items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3"
                >
                  <input
                    type="radio"
                    name="urgency"
                    value={option.value}
                    checked={values.urgency === option.value}
                    onChange={(event) => update('urgency', event.target.value)}
                    className="mt-0.5 h-5 w-5 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink-900">{option.label}</span>
                    <span className="block text-xs text-ink-500">{option.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <fieldset className="space-y-4">
            <legend className="sr-only">依頼の詳細</legend>

            <Field
              label="依頼タイトル"
              htmlFor="request-title"
              required
              hint="例: 201号室の退去後クリーニング"
              errors={fieldErrors.title}
            >
              <TextInput
                id="request-title"
                value={values.title}
                onChange={(event) => update('title', event.target.value)}
                maxLength={100}
                required
                hasError={Boolean(fieldErrors.title)}
              />
            </Field>

            <Field
              label="詳細"
              htmlFor="request-description"
              required
              hint="現在の状況、気になっている点、希望する仕上がりなどをご記入ください。"
              errors={fieldErrors.description}
            >
              <TextArea
                id="request-description"
                value={values.description}
                onChange={(event) => update('description', event.target.value)}
                maxLength={4000}
                rows={6}
                required
                hasError={Boolean(fieldErrors.description)}
              />
            </Field>

            <Field
              label="希望時期"
              htmlFor="request-timing"
              hint="例: 8月中旬まで、次の入居者が決まる前に"
              errors={fieldErrors.preferredTiming}
            >
              <TextInput
                id="request-timing"
                value={values.preferredTiming}
                onChange={(event) => update('preferredTiming', event.target.value)}
                maxLength={100}
                hasError={Boolean(fieldErrors.preferredTiming)}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="予算下限（円）"
                htmlFor="request-budget-min"
                errors={fieldErrors.budgetMinYen}
              >
                <TextInput
                  id="request-budget-min"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={values.budgetMinYen}
                  onChange={(event) => update('budgetMinYen', event.target.value)}
                  hasError={Boolean(fieldErrors.budgetMinYen)}
                />
              </Field>

              <Field
                label="予算上限（円）"
                htmlFor="request-budget-max"
                errors={fieldErrors.budgetMaxYen}
              >
                <TextInput
                  id="request-budget-max"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={values.budgetMaxYen}
                  onChange={(event) => update('budgetMaxYen', event.target.value)}
                  hasError={Boolean(fieldErrors.budgetMaxYen)}
                />
              </Field>
            </div>

            <Field label="補足事項" htmlFor="request-notes" errors={fieldErrors.additionalNotes}>
              <TextArea
                id="request-notes"
                value={values.additionalNotes}
                onChange={(event) => update('additionalNotes', event.target.value)}
                maxLength={2000}
                rows={3}
                hasError={Boolean(fieldErrors.additionalNotes)}
              />
            </Field>
          </fieldset>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <FilePicker
              files={files}
              onChange={setFiles}
              onError={setFileError}
              error={fileError}
              label="依頼写真・書類"
              disabled={isSubmitting}
            />

            <section className="rounded-xl border border-slate-200 bg-white">
              <h2 className="border-b border-slate-100 px-4 py-3 text-base font-semibold text-ink-900">
                入力内容の確認
              </h2>
              <dl className="grid gap-3 p-4 sm:grid-cols-2">
                <ReviewItem label="対象物件" value={selectedProperty?.name ?? '—'} />
                <ReviewItem label="作業カテゴリー" value={serviceCategoryLabel(values.category)} />
                <ReviewItem label="対象箇所・部屋番号" value={values.targetLocation || '—'} />
                <ReviewItem label="緊急度" value={urgencyLabel(values.urgency)} />
                <ReviewItem label="依頼タイトル" value={values.title} wide />
                <ReviewItem label="詳細" value={values.description} wide />
                <ReviewItem label="希望時期" value={values.preferredTiming || '—'} />
                <ReviewItem
                  label="予算"
                  value={formatBudgetRange(
                    values.budgetMinYen === '' ? null : Number(values.budgetMinYen),
                    values.budgetMaxYen === '' ? null : Number(values.budgetMaxYen),
                  )}
                />
                {values.additionalNotes ? (
                  <ReviewItem label="補足事項" value={values.additionalNotes} wide />
                ) : null}
                <ReviewItem
                  label="添付ファイル"
                  value={files.length > 0 ? `${files.length} 件` : 'なし'}
                />
              </dl>
            </section>
          </div>
        ) : null}

        {/* 操作ボタン */}
        <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          {step < 3 ? (
            <Button type="submit" size="lg">
              次へ
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="lg" disabled={isSubmitting} aria-busy={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  送信中…
                </>
              ) : (
                'この内容で依頼する'
              )}
            </Button>
          )}

          {step > 1 ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              disabled={isSubmitting}
              onClick={() => {
                setFormError(null)
                setStep(step === 3 ? 2 : 1)
              }}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              戻る
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

function ReviewItem({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string
  wide?: boolean
}) {
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs font-medium text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm break-words whitespace-pre-wrap text-ink-900">{value}</dd>
    </div>
  )
}
