'use client'

import { useActionState } from 'react'

import { saveWorkReportAction, type AdminRequestActionResult } from '@/actions/admin-requests'
import { Field, TextArea, TextInput } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { todayInTokyo, toDateInputValue } from '@/lib/format/date'
import type { WorkReportForDisplay } from '@/lib/types/display'

export function WorkReportForm({
  requestId,
  workReport,
  currentStatus,
}: {
  requestId: string
  workReport: WorkReportForDisplay | null
  currentStatus: string
}) {
  const [state, formAction] = useActionState<AdminRequestActionResult | null, FormData>(
    saveWorkReportAction,
    null,
  )

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined
  const alreadyCompleted = currentStatus === 'completed'

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

      <input type="hidden" name="requestId" value={requestId} />

      <Field
        label="完了内容"
        htmlFor="report-summary"
        required
        hint="実施した作業と、オーナーへ伝えるべき点を記載してください。オーナー画面に表示されます。"
        errors={fieldErrors?.completionSummary}
      >
        <TextArea
          id="report-summary"
          name="completionSummary"
          defaultValue={workReport?.completion_summary ?? ''}
          rows={5}
          maxLength={4000}
          required
          hasError={Boolean(fieldErrors?.completionSummary)}
        />
      </Field>

      <Field label="完了日" htmlFor="report-completed-at" errors={fieldErrors?.completedAt}>
        <TextInput
          id="report-completed-at"
          name="completedAt"
          type="date"
          defaultValue={
            workReport?.completed_at ? toDateInputValue(workReport.completed_at) : todayInTokyo()
          }
        />
      </Field>

      <label className="flex items-start gap-2 text-sm text-ink-700">
        <input
          type="checkbox"
          name="markCompleted"
          defaultChecked={!alreadyCompleted}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400"
        />
        <span>
          保存と同時に案件ステータスを「完了」へ変更する
          {alreadyCompleted ? '（すでに完了です）' : ''}
        </span>
      </label>

      <SubmitButton pendingLabel="保存中…">
        {workReport ? '完了報告を更新する' : '完了報告を登録する'}
      </SubmitButton>
    </form>
  )
}
