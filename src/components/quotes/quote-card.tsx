import { CalendarCheck, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'

import { Badge } from '@/components/ui/badge'
import { formatYen } from '@/lib/format/currency'
import { formatJapaneseDate, isExpired } from '@/lib/format/date'
import type { QuoteWithDetails } from '@/lib/queries/owner'
import { sumQuoteItems } from '@/lib/validation/quote'
import { cn } from '@/lib/cn'

type Props = {
  quote: QuoteWithDetails
  /** 最安値の見積もりに目印を付ける。 */
  isLowest?: boolean
  /** オーナーが選択済みの見積もり。 */
  isSelected?: boolean
  /** 選択ボタンなどの操作領域。 */
  action?: ReactNode
  /** 管理画面用の追加情報。 */
  adminSlot?: ReactNode
}

/**
 * 見積もりカード。
 * スマートフォンでは横スクロールする比較表にせず、カードを縦に並べる。
 */
export function QuoteCard({ quote, isLowest, isSelected, action, adminSlot }: Props) {
  const expired = isExpired(quote.valid_until)
  const itemTotal = sumQuoteItems(quote.items.map((item) => ({ amountYen: item.amount_yen })))
  const hasMismatch = quote.items.length > 0 && itemTotal !== quote.total_yen

  return (
    <article
      className={cn(
        'rounded-xl border bg-white',
        isSelected ? 'border-emerald-400 ring-1 ring-emerald-200' : 'border-slate-200',
      )}
    >
      <header className="space-y-2 border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {isSelected ? (
            <Badge tone="success">
              <CheckCircle2 aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
              選択済み
            </Badge>
          ) : null}
          {isLowest && !isSelected ? <Badge tone="info">最安</Badge> : null}
          {expired ? <Badge tone="muted">有効期限切れ</Badge> : null}
          {adminSlot}
        </div>

        <h3 className="text-base font-bold break-words text-ink-900">{quote.providerName}</h3>

        <p className="flex items-baseline gap-1.5">
          <span className="text-xs text-ink-500">税込総額</span>
          <span className="text-2xl font-bold text-brand-700 tabular-nums">
            {formatYen(quote.total_yen)}
          </span>
        </p>

        {quote.subtotal_yen !== null || quote.tax_yen !== null ? (
          <p className="text-xs text-ink-500">
            {quote.subtotal_yen !== null ? `税抜 ${formatYen(quote.subtotal_yen)}` : null}
            {quote.subtotal_yen !== null && quote.tax_yen !== null ? ' / ' : null}
            {quote.tax_yen !== null ? `消費税 ${formatYen(quote.tax_yen)}` : null}
          </p>
        ) : null}
      </header>

      <div className="space-y-4 p-4">
        {/* 条件のサマリー */}
        <dl className="grid gap-3 sm:grid-cols-2">
          <SummaryItem
            icon={<CalendarCheck aria-hidden="true" className="h-4 w-4" />}
            label="対応可能日"
            value={quote.available_date ? formatJapaneseDate(quote.available_date) : '要相談'}
          />
          <SummaryItem
            icon={<Clock aria-hidden="true" className="h-4 w-4" />}
            label="作業日数"
            value={quote.estimated_work_days ? `${quote.estimated_work_days} 日` : '要相談'}
          />
          <SummaryItem
            icon={<ShieldCheck aria-hidden="true" className="h-4 w-4" />}
            label="見積有効期限"
            value={quote.valid_until ? formatJapaneseDate(quote.valid_until) : '記載なし'}
          />
          <SummaryItem
            icon={<CheckCircle2 aria-hidden="true" className="h-4 w-4" />}
            label="見積番号"
            value={quote.quote_number ?? '—'}
          />
        </dl>

        {/* 見積明細 */}
        {quote.items.length > 0 ? (
          <section>
            <h4 className="text-sm font-semibold text-ink-900">見積明細</h4>
            <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {quote.items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 p-3">
                  <span className="min-w-0 flex-1 text-sm text-ink-900">{item.item_name}</span>
                  <span className="text-xs text-ink-500">
                    {item.quantity !== null
                      ? `${item.quantity}${item.unit ?? ''}`
                      : (item.unit ?? '')}
                    {item.unit_price_yen !== null ? ` × ${formatYen(item.unit_price_yen)}` : ''}
                  </span>
                  <span className="text-sm font-medium text-ink-900 tabular-nums">
                    {formatYen(item.amount_yen)}
                  </span>
                  {item.notes ? (
                    <span className="w-full text-xs text-ink-500">{item.notes}</span>
                  ) : null}
                </li>
              ))}
              <li className="flex items-baseline justify-between gap-2 bg-slate-50 p-3">
                <span className="text-sm font-medium text-ink-700">明細合計</span>
                <span className="text-sm font-semibold text-ink-900 tabular-nums">
                  {formatYen(itemTotal)}
                </span>
              </li>
            </ul>
            {hasMismatch ? (
              <p className="mt-2 text-xs text-ink-500">
                明細合計と税込総額には差があります（端数調整または一式見積もりのため）。
                お支払いは税込総額が基準です。
              </p>
            ) : null}
          </section>
        ) : (
          <p className="text-sm text-ink-500">
            明細の内訳はありません（一式見積もり）。作業範囲は下記をご確認ください。
          </p>
        )}

        {/* 作業範囲・条件 */}
        <div className="space-y-3">
          <TextBlock title="作業に含まれる内容" value={quote.included_scope} tone="included" />
          <TextBlock title="作業に含まれない内容" value={quote.excluded_scope} tone="excluded" />
          <TextBlock title="追加料金が発生する条件" value={quote.additional_charge_conditions} />
          <TextBlock title="保証内容" value={quote.warranty} />
          <TextBlock title="運営者からのコメント" value={quote.admin_comment} tone="comment" />
        </div>
      </div>

      {action ? <div className="border-t border-slate-100 p-4">{action}</div> : null}
    </article>
  )
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-ink-500">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-ink-500">{label}</dt>
        <dd className="text-sm font-medium break-words text-ink-900">{value}</dd>
      </div>
    </div>
  )
}

function TextBlock({
  title,
  value,
  tone,
}: {
  title: string
  value: string | null
  tone?: 'included' | 'excluded' | 'comment'
}) {
  if (!value || value.trim() === '') return null

  return (
    <section
      className={cn(
        'rounded-lg border p-3',
        tone === 'included' && 'border-emerald-200 bg-emerald-50',
        tone === 'excluded' && 'border-amber-200 bg-amber-50',
        tone === 'comment' && 'border-brand-200 bg-brand-50',
        !tone && 'border-slate-200 bg-slate-50',
      )}
    >
      <h4 className="text-xs font-semibold text-ink-700">{title}</h4>
      <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap text-ink-900">
        {value}
      </p>
    </section>
  )
}
