'use client'

import { useActionState } from 'react'

import { updateRequestStatusAction, type AdminRequestActionResult } from '@/actions/admin-requests'
import { Field, Select } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { REQUEST_STATUS_OPTIONS } from '@/lib/constants/statuses'

export function StatusForm({
  requestId,
  currentStatus,
  hasPublishedQuote,
}: {
  requestId: string
  currentStatus: string
  hasPublishedQuote: boolean
}) {
  const [state, formAction] = useActionState<AdminRequestActionResult | null, FormData>(
    updateRequestStatusAction,
    null,
  )

  return (
    <form action={formAction} className="space-y-3" noValidate>
      {state?.ok ? (
        <Alert variant="success" title="更新しました">
          {state.message}
        </Alert>
      ) : null}
      {state && !state.ok ? (
        <Alert variant="error" title="更新できませんでした">
          {state.message}
        </Alert>
      ) : null}

      <input type="hidden" name="requestId" value={requestId} />

      <Field
        label="ステータス"
        htmlFor="admin-status"
        required
        errors={state?.ok ? undefined : state?.fieldErrors?.status}
      >
        <Select id="admin-status" name="status" defaultValue={currentStatus} required>
          {REQUEST_STATUS_OPTIONS.map((option) => (
            <option
              key={option.value}
              value={option.value}
              // 公開済み見積もりが無い場合、見積もり確認待ちには変更できない
              disabled={option.value === 'quotes_ready' && !hasPublishedQuote}
            >
              {option.label}
              {option.value === 'quotes_ready' && !hasPublishedQuote
                ? '（見積もり公開が必要）'
                : ''}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pendingLabel="更新中…">ステータスを更新</SubmitButton>
    </form>
  )
}
