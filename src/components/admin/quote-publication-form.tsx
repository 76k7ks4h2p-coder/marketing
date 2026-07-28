'use client'

import { useActionState } from 'react'

import { changeQuotePublicationAction, type QuotePublicationResult } from '@/actions/quotes'
import { Alert } from '@/components/ui/feedback'
import { SubmitButton } from '@/components/ui/submit-button'

type Props = {
  quoteId: string
  publicationStatus: string
  isSelected: boolean
}

/**
 * 見積もりの公開 / 取り下げ。
 * 公開時は同時に案件ステータスを「見積もり確認待ち」へ進められる。
 */
export function QuotePublicationForm({ quoteId, publicationStatus, isSelected }: Props) {
  const [state, formAction] = useActionState<QuotePublicationResult | null, FormData>(
    changeQuotePublicationAction,
    null,
  )

  const isPublished = publicationStatus === 'published'

  return (
    <div className="space-y-2">
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

      {isPublished ? (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="publicationStatus" value="withdrawn" />
          <SubmitButton variant="secondary" size="sm" pendingLabel="処理中…" disabled={isSelected}>
            見積もりを取り下げる
          </SubmitButton>
          {isSelected ? (
            <p className="text-xs text-ink-500">オーナーが選択済みのため取り下げできません。</p>
          ) : null}
        </form>
      ) : (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="quoteId" value={quoteId} />
          <input type="hidden" name="publicationStatus" value="published" />

          <label className="flex items-start gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              name="moveRequestToQuotesReady"
              defaultChecked
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400"
            />
            <span>公開と同時に案件ステータスを「見積もり確認待ち」へ変更する</span>
          </label>

          <SubmitButton size="sm" pendingLabel="公開中…">
            オーナーへ公開する
          </SubmitButton>
        </form>
      )}
    </div>
  )
}
