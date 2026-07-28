'use client'

import { Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useState } from 'react'

import type { QuoteActionResult } from '@/actions/quotes'
import { Button } from '@/components/ui/button'
import { Field, Select, TextArea, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import {
  QUOTE_PUBLICATION_STATUS_LABELS,
  QUOTE_PUBLICATION_STATUS_VALUES,
} from '@/lib/constants/quotes'
import { formatYen } from '@/lib/format/currency'
import { todayInTokyo } from '@/lib/format/date'
import type { ProviderRow, QuoteItemRow, QuoteRow } from '@/lib/types/database'

type ItemRow = {
  key: string
  id: string
  itemName: string
  quantity: string
  unit: string
  unitPriceYen: string
  amountYen: string
  notes: string
}

type Props = {
  action: (prevState: QuoteActionResult | null, formData: FormData) => Promise<QuoteActionResult>
  requestId: string
  providers: ProviderRow[]
  quote?: QuoteRow
  items?: QuoteItemRow[]
  submitLabel: string
  cancelHref: string
}

function emptyRow(): ItemRow {
  return {
    key: crypto.randomUUID(),
    id: '',
    itemName: '',
    quantity: '',
    unit: '',
    unitPriceYen: '',
    amountYen: '',
    notes: '',
  }
}

function toItemRows(items: QuoteItemRow[] | undefined): ItemRow[] {
  if (!items || items.length === 0) return [emptyRow()]
  return items.map((item) => ({
    key: item.id,
    id: item.id,
    itemName: item.item_name,
    quantity: item.quantity === null ? '' : String(item.quantity),
    unit: item.unit ?? '',
    unitPriceYen: item.unit_price_yen === null ? '' : String(item.unit_price_yen),
    amountYen: String(item.amount_yen),
    notes: item.notes ?? '',
  }))
}

export function QuoteForm({
  action,
  requestId,
  providers,
  quote,
  items,
  submitLabel,
  cancelHref,
}: Props) {
  const [state, formAction] = useActionState<QuoteActionResult | null, FormData>(action, null)
  const [rows, setRows] = useState<ItemRow[]>(() => toItemRows(items))
  const [totalYen, setTotalYen] = useState<string>(quote ? String(quote.total_yen) : '')

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined

  const itemTotal = rows.reduce((sum, row) => {
    const value = Number(row.amountYen)
    return Number.isFinite(value) && row.itemName.trim() !== '' ? sum + value : sum
  }, 0)

  const filledRows = rows.filter((row) => row.itemName.trim() !== '')
  const parsedTotal = Number(totalYen)
  const hasMismatch =
    filledRows.length > 0 &&
    Number.isFinite(parsedTotal) &&
    totalYen !== '' &&
    itemTotal !== parsedTotal

  function updateRow(key: string, patch: Partial<ItemRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state && !state.ok ? (
        <Alert
          variant={state.warning ? 'warning' : 'error'}
          title={state.warning ? '確認してください' : '保存できませんでした'}
        >
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="requestId" value={requestId} />
      {quote ? <input type="hidden" name="quoteId" value={quote.id} /> : null}

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">見積もり基本情報</legend>

        <Field label="業者" htmlFor="quote-provider" required errors={fieldErrors?.providerId}>
          <Select
            id="quote-provider"
            name="providerId"
            defaultValue={quote?.provider_id ?? ''}
            required
            hasError={Boolean(fieldErrors?.providerId)}
          >
            <option value="" disabled>
              選択してください
            </option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.name}
                {provider.is_active ? '' : '（無効）'}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="見積番号" htmlFor="quote-number" errors={fieldErrors?.quoteNumber}>
            <TextInput
              id="quote-number"
              name="quoteNumber"
              defaultValue={quote?.quote_number ?? ''}
              maxLength={50}
            />
          </Field>

          <Field label="見積作成日" htmlFor="quote-date" errors={fieldErrors?.quoteDate}>
            <TextInput
              id="quote-date"
              name="quoteDate"
              type="date"
              defaultValue={quote?.quote_date ?? todayInTokyo()}
            />
          </Field>

          <Field label="見積有効期限" htmlFor="quote-valid-until" errors={fieldErrors?.validUntil}>
            <TextInput
              id="quote-valid-until"
              name="validUntil"
              type="date"
              defaultValue={quote?.valid_until ?? ''}
              hasError={Boolean(fieldErrors?.validUntil)}
            />
          </Field>

          <Field
            label="対応可能日"
            htmlFor="quote-available-date"
            errors={fieldErrors?.availableDate}
          >
            <TextInput
              id="quote-available-date"
              name="availableDate"
              type="date"
              defaultValue={quote?.available_date ?? ''}
            />
          </Field>

          <Field label="作業日数" htmlFor="quote-work-days" errors={fieldErrors?.estimatedWorkDays}>
            <TextInput
              id="quote-work-days"
              name="estimatedWorkDays"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              defaultValue={quote?.estimated_work_days ?? ''}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">金額</legend>

        <Alert variant="info" title="税込総額のみでも登録できます">
          業者から税込総額しか提示されていない場合は、税抜金額・消費税額は空欄のままで構いません。
        </Alert>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="税抜金額（円）" htmlFor="quote-subtotal" errors={fieldErrors?.subtotalYen}>
            <TextInput
              id="quote-subtotal"
              name="subtotalYen"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={quote?.subtotal_yen ?? ''}
            />
          </Field>

          <Field label="消費税額（円）" htmlFor="quote-tax" errors={fieldErrors?.taxYen}>
            <TextInput
              id="quote-tax"
              name="taxYen"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={quote?.tax_yen ?? ''}
            />
          </Field>

          <Field
            label="税込総額（円）"
            htmlFor="quote-total"
            required
            errors={fieldErrors?.totalYen}
          >
            <TextInput
              id="quote-total"
              name="totalYen"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              required
              value={totalYen}
              onChange={(event) => setTotalYen(event.target.value)}
              hasError={Boolean(fieldErrors?.totalYen)}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">見積明細</legend>

        <ul className="space-y-3">
          {rows.map((row, index) => (
            <li key={row.key} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-700">明細 {index + 1}</span>
                {rows.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                    className="flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    この明細を削除
                  </button>
                ) : null}
              </div>

              <input type="hidden" name={`items.${index}.id`} value={row.id} />

              <Field
                label="項目名"
                htmlFor={`item-name-${row.key}`}
                errors={fieldErrors?.[`items.${index}.itemName`]}
              >
                <TextInput
                  id={`item-name-${row.key}`}
                  name={`items.${index}.itemName`}
                  value={row.itemName}
                  onChange={(event) => updateRow(row.key, { itemName: event.target.value })}
                  maxLength={200}
                />
              </Field>

              <div className="grid gap-3 sm:grid-cols-4">
                <Field
                  label="数量"
                  htmlFor={`item-qty-${row.key}`}
                  errors={fieldErrors?.[`items.${index}.quantity`]}
                >
                  <TextInput
                    id={`item-qty-${row.key}`}
                    name={`items.${index}.quantity`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={row.quantity}
                    onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                  />
                </Field>

                <Field label="単位" htmlFor={`item-unit-${row.key}`}>
                  <TextInput
                    id={`item-unit-${row.key}`}
                    name={`items.${index}.unit`}
                    value={row.unit}
                    onChange={(event) => updateRow(row.key, { unit: event.target.value })}
                    maxLength={20}
                    placeholder="式 / ㎡ / 回"
                  />
                </Field>

                <Field
                  label="単価（円）"
                  htmlFor={`item-price-${row.key}`}
                  errors={fieldErrors?.[`items.${index}.unitPriceYen`]}
                >
                  <TextInput
                    id={`item-price-${row.key}`}
                    name={`items.${index}.unitPriceYen`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={row.unitPriceYen}
                    onChange={(event) => updateRow(row.key, { unitPriceYen: event.target.value })}
                  />
                </Field>

                <Field
                  label="金額（円）"
                  htmlFor={`item-amount-${row.key}`}
                  required
                  errors={fieldErrors?.[`items.${index}.amountYen`]}
                >
                  <TextInput
                    id={`item-amount-${row.key}`}
                    name={`items.${index}.amountYen`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={row.amountYen}
                    onChange={(event) => updateRow(row.key, { amountYen: event.target.value })}
                  />
                </Field>
              </div>

              <Field label="明細の備考" htmlFor={`item-notes-${row.key}`}>
                <TextInput
                  id={`item-notes-${row.key}`}
                  name={`items.${index}.notes`}
                  value={row.notes}
                  onChange={(event) => updateRow(row.key, { notes: event.target.value })}
                  maxLength={500}
                />
              </Field>
            </li>
          ))}
        </ul>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setRows((current) => [...current, emptyRow()])}
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          明細を追加
        </Button>

        <div className="rounded-lg bg-slate-50 p-3">
          <p className="flex justify-between text-sm">
            <span className="text-ink-500">明細合計</span>
            <span className="font-semibold text-ink-900 tabular-nums">{formatYen(itemTotal)}</span>
          </p>
          <p className="mt-1 flex justify-between text-sm">
            <span className="text-ink-500">税込総額</span>
            <span className="font-semibold text-ink-900 tabular-nums">
              {totalYen === '' ? '—' : formatYen(parsedTotal)}
            </span>
          </p>
        </div>

        {hasMismatch ? (
          <Alert variant="warning" title="明細合計と税込総額が一致していません">
            <p>
              差額は {formatYen(Math.abs(parsedTotal - itemTotal))} です。
              端数調整や一式見積もりで意図的な差異であれば、下のチェックを入れてそのまま保存できます。
            </p>
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                name="acknowledgeTotalMismatch"
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400"
              />
              <span>差異を確認しました。この内容で保存します。</span>
            </label>
          </Alert>
        ) : (
          // 一致している場合も、サーバー側の再検証で警告が出たときに再送信できるようにしておく
          <input type="hidden" name="acknowledgeTotalMismatch" value="" />
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">作業範囲・条件</legend>

        <Field
          label="作業に含まれる内容"
          htmlFor="quote-included"
          errors={fieldErrors?.includedScope}
        >
          <TextArea
            id="quote-included"
            name="includedScope"
            defaultValue={quote?.included_scope ?? ''}
            rows={4}
            maxLength={2000}
          />
        </Field>

        <Field
          label="作業に含まれない内容"
          htmlFor="quote-excluded"
          errors={fieldErrors?.excludedScope}
        >
          <TextArea
            id="quote-excluded"
            name="excludedScope"
            defaultValue={quote?.excluded_scope ?? ''}
            rows={4}
            maxLength={2000}
          />
        </Field>

        <Field
          label="追加料金条件"
          htmlFor="quote-additional"
          errors={fieldErrors?.additionalChargeConditions}
        >
          <TextArea
            id="quote-additional"
            name="additionalChargeConditions"
            defaultValue={quote?.additional_charge_conditions ?? ''}
            rows={3}
            maxLength={2000}
          />
        </Field>

        <Field label="保証内容" htmlFor="quote-warranty" errors={fieldErrors?.warranty}>
          <TextArea
            id="quote-warranty"
            name="warranty"
            defaultValue={quote?.warranty ?? ''}
            rows={3}
            maxLength={2000}
          />
        </Field>

        <Field
          label="運営者コメント"
          htmlFor="quote-comment"
          hint="オーナーにも表示されます。比較の参考になる補足を記載してください。"
          errors={fieldErrors?.adminComment}
        >
          <TextArea
            id="quote-comment"
            name="adminComment"
            defaultValue={quote?.admin_comment ?? ''}
            rows={3}
            maxLength={2000}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-base font-semibold text-ink-900">公開状態</legend>

        <Field
          label="公開状態"
          htmlFor="quote-publication"
          required
          hint="「公開中」にするとオーナーの画面に表示されます。"
          errors={fieldErrors?.publicationStatus}
        >
          <Select
            id="quote-publication"
            name="publicationStatus"
            defaultValue={quote?.publication_status ?? 'draft'}
            required
          >
            {QUOTE_PUBLICATION_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {QUOTE_PUBLICATION_STATUS_LABELS[value]}
              </option>
            ))}
          </Select>
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
