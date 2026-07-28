'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useEffect } from 'react'

import { selectQuoteAction, type SelectQuoteResult } from '@/actions/quote-selection'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'
import { QUOTE_SELECTION_CONFIRM_MESSAGE } from '@/lib/constants/quotes'
import { formatYen } from '@/lib/format/currency'

type Props = {
  requestId: string
  quoteId: string
  providerName: string
  totalYen: number
  disabled?: boolean
}

export function SelectQuoteButton({
  requestId,
  quoteId,
  providerName,
  totalYen,
  disabled = false,
}: Props) {
  const router = useRouter()
  const [state, formAction] = useActionState<SelectQuoteResult | null, FormData>(
    selectQuoteAction,
    null,
  )

  useEffect(() => {
    if (state?.ok) {
      // 選択後は他の見積もりを選べないようにするため、サーバー側の状態を取り直す
      router.refresh()
    }
  }, [state?.ok, router])

  return (
    <div className="space-y-2">
      {state && !state.ok ? (
        <Alert variant="error" title="選択できませんでした">
          {state.message}
        </Alert>
      ) : null}

      <ConfirmDialog
        triggerLabel="この業者を選ぶ"
        triggerDisabled={disabled}
        triggerClassName="w-full"
        title="見積もりの選択"
        message={
          <div className="space-y-2">
            <p>{QUOTE_SELECTION_CONFIRM_MESSAGE}</p>
            <dl className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-ink-500">業者</dt>
                <dd className="font-medium text-ink-900">{providerName}</dd>
              </div>
              <div className="mt-1 flex justify-between gap-2">
                <dt className="text-ink-500">税込総額</dt>
                <dd className="font-medium text-ink-900 tabular-nums">{formatYen(totalYen)}</dd>
              </div>
            </dl>
          </div>
        }
      >
        <form action={formAction}>
          <input type="hidden" name="requestId" value={requestId} />
          <input type="hidden" name="quoteId" value={quoteId} />
          <SubmitButton pendingLabel="選択中…">この見積もりで確定する</SubmitButton>
        </form>
      </ConfirmDialog>
    </div>
  )
}
