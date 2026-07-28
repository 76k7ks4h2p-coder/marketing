'use client'

import { Trash2 } from 'lucide-react'

import { deletePropertyAction } from '@/actions/properties'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { SubmitButton } from '@/components/ui/submit-button'

export function DeletePropertyButton({
  propertyId,
  propertyName,
}: {
  propertyId: string
  propertyName: string
}) {
  return (
    <ConfirmDialog
      triggerLabel="この物件を削除する"
      triggerVariant="danger"
      title="物件の削除"
      message={<p>「{propertyName}」を削除します。この操作は取り消せません。よろしいですか。</p>}
    >
      <form action={deletePropertyAction}>
        <input type="hidden" name="propertyId" value={propertyId} />
        <SubmitButton variant="danger" pendingLabel="削除中…">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          削除する
        </SubmitButton>
      </form>
    </ConfirmDialog>
  )
}
