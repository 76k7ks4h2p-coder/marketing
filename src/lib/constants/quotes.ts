/** 見積もりの公開状態。 */

export const QUOTE_PUBLICATION_STATUS_VALUES = ['draft', 'published', 'withdrawn'] as const

export type QuotePublicationStatus = (typeof QUOTE_PUBLICATION_STATUS_VALUES)[number]

export const QUOTE_PUBLICATION_STATUS_LABELS: Record<QuotePublicationStatus, string> = {
  draft: '下書き',
  published: '公開中',
  withdrawn: '取り下げ',
}

export const QUOTE_PUBLICATION_STATUS_TONES: Record<
  QuotePublicationStatus,
  'muted' | 'success' | 'neutral'
> = {
  draft: 'muted',
  published: 'success',
  withdrawn: 'neutral',
}

export function isQuotePublicationStatus(value: unknown): value is QuotePublicationStatus {
  return (
    typeof value === 'string' &&
    (QUOTE_PUBLICATION_STATUS_VALUES as readonly string[]).includes(value)
  )
}

export function quotePublicationStatusLabel(value: string): string {
  return isQuotePublicationStatus(value) ? QUOTE_PUBLICATION_STATUS_LABELS[value] : value
}

/** 見積明細合計と税込総額の差がこの金額を超えたら管理者に警告する。 */
export const QUOTE_TOTAL_MISMATCH_TOLERANCE_YEN = 0

/** 見積もり選択前に表示する確認文。 */
export const QUOTE_SELECTION_CONFIRM_MESSAGE =
  'この見積もりを選択します。選択後の変更は運営者への連絡が必要です。'

/** 見積もりが 1 件も公開されていないときにオーナー画面へ表示する文言。 */
export const QUOTES_PENDING_MESSAGE = '現在、内容を確認し、見積もりを取得しています。'
