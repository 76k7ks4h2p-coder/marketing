import { QuoteCard } from '@/components/quotes/quote-card'
import { SelectQuoteButton } from '@/components/quotes/select-quote-button'
import { Alert, EmptyState } from '@/components/ui/feedback'
import { QUOTES_PENDING_MESSAGE } from '@/lib/constants/quotes'
import { CLOSED_REQUEST_STATUSES } from '@/lib/constants/statuses'
import { formatJapaneseDateTime } from '@/lib/format/date'
import type { QuoteWithDetails } from '@/lib/queries/owner'

type Props = {
  requestId: string
  requestStatus: string
  quotes: QuoteWithDetails[]
  selectedQuoteId: string | null
  selectedAt: string | null
}

/**
 * オーナー向けの見積もり比較セクション。
 *
 * すでに選択済みの場合、通常の画面操作から他の見積もりを選べないようにする
 * （選択ボタンを出さない）。DB 側でも 1 案件 1 件に制限されている。
 */
export function QuoteComparison({
  requestId,
  requestStatus,
  quotes,
  selectedQuoteId,
  selectedAt,
}: Props) {
  if (quotes.length === 0) {
    return (
      <EmptyState
        title={QUOTES_PENDING_MESSAGE}
        description="見積もりがそろい次第、この画面に表示され、メールでもお知らせします。"
      />
    )
  }

  const lowestTotal = Math.min(...quotes.map((quote) => quote.total_yen))
  const hasSelection = selectedQuoteId !== null
  const isClosed = (CLOSED_REQUEST_STATUSES as readonly string[]).includes(requestStatus)

  const selectedQuote = quotes.find((quote) => quote.id === selectedQuoteId)

  return (
    <div className="space-y-4">
      {hasSelection ? (
        <Alert variant="success" title="業者を選択済みです">
          <p>
            {selectedQuote ? `${selectedQuote.providerName} を選択しています。` : null}
            {selectedAt ? `（${formatJapaneseDateTime(selectedAt)}）` : null}
          </p>
          <p className="mt-1">
            選択後の変更は運営者への連絡が必要です。画面上から選び直すことはできません。
          </p>
        </Alert>
      ) : (
        <Alert variant="info" title="内容を比較してお選びください">
          <p>
            金額だけでなく、作業に含まれる内容・含まれない内容・追加料金の条件もあわせてご確認ください。
            1 社を選択すると運営者が日程調整のご連絡をいたします。
          </p>
        </Alert>
      )}

      <ul className="space-y-4">
        {quotes.map((quote) => {
          const isSelected = quote.id === selectedQuoteId

          return (
            <li key={quote.id}>
              <QuoteCard
                quote={quote}
                isLowest={quote.total_yen === lowestTotal && quotes.length > 1}
                isSelected={isSelected}
                action={
                  !hasSelection && !isClosed ? (
                    <SelectQuoteButton
                      requestId={requestId}
                      quoteId={quote.id}
                      providerName={quote.providerName}
                      totalYen={quote.total_yen}
                    />
                  ) : null
                }
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
