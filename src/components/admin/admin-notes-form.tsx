'use client'

import { useActionState } from 'react'

import { updateAdminNotesAction, type AdminRequestActionResult } from '@/actions/admin-requests'
import { Field, TextArea } from '@/components/ui/field'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'

export function AdminNotesForm({
  requestId,
  adminNotes,
}: {
  requestId: string
  adminNotes: string | null
}) {
  const [state, formAction] = useActionState<AdminRequestActionResult | null, FormData>(
    updateAdminNotesAction,
    null,
  )

  return (
    <form action={formAction} className="space-y-3" noValidate>
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
        label="管理者メモ"
        htmlFor="admin-notes"
        hint="運営者のみが閲覧できます。オーナー画面には表示されません。"
        errors={state?.ok ? undefined : state?.fieldErrors?.adminNotes}
      >
        <TextArea
          id="admin-notes"
          name="adminNotes"
          defaultValue={adminNotes ?? ''}
          rows={5}
          maxLength={4000}
        />
      </Field>

      <SubmitButton variant="secondary" pendingLabel="保存中…">
        メモを保存
      </SubmitButton>
    </form>
  )
}
