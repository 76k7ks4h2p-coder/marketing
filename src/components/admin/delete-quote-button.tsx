'use client'

import { Trash2 } from 'lucide-react'

import { deleteQuoteAction } from '@/actions/quotes'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SubmitButton } from '@/components/ui/submit-button'

export function DeleteQuoteButton({
  quoteId,
  requestId,
  providerName,
  disabled = false,
}: {
  quoteId: string
  requestId: string
  providerName: string
  disabled?: boolean
}) {
  return (
    <ConfirmDialog
      triggerLabel="削除"
      triggerVariant="ghost"
      triggerDisabled={disabled}
      title="見積もりの削除"
      message={<p>「{providerName}」の見積もりを削除します。この操作は取り消せません。</p>}
    >
      <form action={deleteQuoteAction}>
        <input type="hidden" name="quoteId" value={quoteId} />
        <input type="hidden" name="requestId" value={requestId} />
        <SubmitButton variant="danger" pendingLabel="削除中…">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          削除する
        </SubmitButton>
      </form>
    </ConfirmDialog>
  )
}
